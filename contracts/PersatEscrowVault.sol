// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {PersatDealRegistry} from "./PersatDealRegistry.sol";

interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function decimals() external view returns (uint8);
}

contract PersatEscrowVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OracleStale();
    error OracleInvalidPrice();
    error LTVHealthy();
    error InsufficientLTV();
    error TermsHashMismatch();
    error NotBorrower();
    error DealNotActive();
    error RepaymentFailed();
    error ZeroAddress();
    error FeeTooHigh();
    error CircBTCRescueBlocked();
    error InvalidParameter();

    event LoanActivated(
        bytes16 indexed dealId,
        address indexed borrower,
        address indexed lender,
        uint256 principal,
        uint256 collateral,
        uint256 fee,
        uint256 claimableUsdcAmount
    );
    event LoanRepaid(bytes16 indexed dealId, uint256 totalRepayment, uint256 collateralReleased);
    event LoanLiquidated(bytes16 indexed dealId, address indexed liquidator, uint256 btcUsdPrice, uint256 ltvBps);
    event LoanDefaulted(bytes16 indexed dealId);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event PrincipalClaimed(bytes16 indexed dealId, address indexed borrower, uint256 amount);

    uint256 public constant MAX_FEE_BPS = 50;

    IPriceFeed public immutable priceFeed;
    uint256 public immutable stalenessThreshold;
    uint256 public immutable liquidationThresholdBps;
    uint8 public immutable priceFeedDecimals;
    uint8 public immutable cirBtcDecimals;
    address public immutable usdc;
    address public immutable cirBtc;
    PersatDealRegistry public immutable registry;

    mapping(bytes16 => uint256) public lockedCollateral;
    mapping(bytes16 => uint256) public claimableUsdc;

    address public feeRecipient;
    uint256 public feeBps;

    constructor(
        address registry_,
        address usdc_,
        address cirBtc_,
        address priceFeed_,
        uint256 stalenessThreshold_,
        uint256 liquidationThresholdBps_,
        address feeRecipient_,
        uint256 feeBps_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            registry_ == address(0) || usdc_ == address(0) || cirBtc_ == address(0) || priceFeed_ == address(0)
                || feeRecipient_ == address(0) || initialOwner == address(0)
        ) {
            revert ZeroAddress();
        }
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (stalenessThreshold_ == 0) revert InvalidParameter();
        if (liquidationThresholdBps_ == 0 || liquidationThresholdBps_ > 10_000) revert InvalidParameter();

        registry = PersatDealRegistry(registry_);
        usdc = usdc_;
        cirBtc = cirBtc_;
        priceFeed = IPriceFeed(priceFeed_);
        stalenessThreshold = stalenessThreshold_;
        liquidationThresholdBps = liquidationThresholdBps_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;

        priceFeedDecimals = IPriceFeed(priceFeed_).decimals();
        if (priceFeedDecimals < 6 || priceFeedDecimals > 18) revert InvalidParameter();
        cirBtcDecimals = IERC20Metadata(cirBtc_).decimals();
    }

    function activateLoan(bytes16 dealId) external nonReentrant whenNotPaused {
        PersatDealRegistry.Deal memory deal = registry.getDeal(dealId);

        if (deal.state != PersatDealRegistry.DealState.Confirmed) {
            revert DealNotActive();
        }
        if (msg.sender != deal.borrower) revert NotBorrower();
        if (_computeTermsHash(deal) != deal.termsHash) revert TermsHashMismatch();

        registry.setDealActive(dealId, block.timestamp);

        uint256 feeAmount = deal.principal * feeBps / 10_000;
        uint256 borrowerPrincipal = deal.principal - feeAmount;

        uint256 collateralBefore = IERC20(cirBtc).balanceOf(address(this));
        IERC20(cirBtc).safeTransferFrom(deal.borrower, address(this), deal.collateral);
        uint256 collateralAfter = IERC20(cirBtc).balanceOf(address(this));
        uint256 actualCollateral = collateralAfter - collateralBefore;

        lockedCollateral[dealId] = actualCollateral;

        IERC20(usdc).safeTransferFrom(deal.lender, address(this), borrowerPrincipal);
        claimableUsdc[dealId] = borrowerPrincipal;
        if (feeAmount > 0) {
            IERC20(usdc).safeTransferFrom(deal.lender, feeRecipient, feeAmount);
        }

        emit LoanActivated(dealId, deal.borrower, deal.lender, deal.principal, actualCollateral, feeAmount, borrowerPrincipal);
    }

    function claimPrincipal(bytes16 dealId) external nonReentrant {
        PersatDealRegistry.Deal memory deal = registry.getDeal(dealId);

        if (deal.borrower != msg.sender) revert NotBorrower();
        if (deal.state != PersatDealRegistry.DealState.Active) revert DealNotActive();

        uint256 amount = claimableUsdc[dealId];
        if (amount == 0) revert InvalidParameter();

        claimableUsdc[dealId] = 0;
        IERC20(usdc).safeTransfer(deal.borrower, amount);

        emit PrincipalClaimed(dealId, deal.borrower, amount);
    }

    function repayLoan(bytes16 dealId) external nonReentrant {
        PersatDealRegistry.Deal memory deal = registry.getDeal(dealId);

        bool isActive = deal.state == PersatDealRegistry.DealState.Active;
        bool isDefaulted = deal.state == PersatDealRegistry.DealState.Defaulted;
        if (!isActive && !isDefaulted) {
            revert DealNotActive();
        }
        if (msg.sender != deal.borrower) revert NotBorrower();
        if (_computeTermsHash(deal) != deal.termsHash) revert TermsHashMismatch();

        uint256 interest = deal.principal * deal.rateBps * deal.durationMonths / (10_000 * 12);
        uint256 totalRepayment = deal.principal + interest;
        uint256 collateralToRelease = lockedCollateral[dealId];

        // Both Active and Defaulted repayments are treated as Completed — borrower cured the debt.
        // CEI: clear state before transfers.
        delete lockedCollateral[dealId];
        registry.setDealCompleted(dealId);

        IERC20(usdc).safeTransferFrom(deal.borrower, deal.lender, totalRepayment);
        IERC20(cirBtc).safeTransfer(deal.borrower, collateralToRelease);

        emit LoanRepaid(dealId, totalRepayment, collateralToRelease);
    }

    function liquidate(bytes16 dealId) public nonReentrant {
        PersatDealRegistry.Deal memory deal = registry.getDeal(dealId);

        bool isActive = deal.state == PersatDealRegistry.DealState.Active;
        bool isDefaulted = deal.state == PersatDealRegistry.DealState.Defaulted;
        if (!isActive && !isDefaulted) revert DealNotActive();
        if (_computeTermsHash(deal) != deal.termsHash) revert TermsHashMismatch();

        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();
        if (answeredInRound < roundId) revert OracleInvalidPrice();
        if (startedAt == 0) revert OracleInvalidPrice();
        if (answer <= 0) revert OracleInvalidPrice();
        if (block.timestamp - updatedAt > stalenessThreshold) revert OracleStale();

        uint256 btcUsdPrice = uint256(answer);
        uint256 collateralAmount = lockedCollateral[dealId];

        uint256 collateralUsdValue = _cirBtcToUsdcValue(collateralAmount, btcUsdPrice);
        if (collateralUsdValue == 0) revert InsufficientLTV();

        uint256 ltvBps = deal.principal * 10_000 / collateralUsdValue;
        if (ltvBps < liquidationThresholdBps) revert LTVHealthy();

        // CEI: clear state before transfers.
        delete lockedCollateral[dealId];
        registry.setDealLiquidated(dealId);

        uint256 debtUsdc = deal.principal;
        if (collateralUsdValue >= debtUsdc) {
            uint256 collateralForLender = _usdcToCirBtcAmount(debtUsdc, btcUsdPrice);
            if (collateralForLender > collateralAmount) {
                collateralForLender = collateralAmount;
            }

            uint256 collateralForBorrower = collateralAmount - collateralForLender;
            if (collateralForLender > 0) {
                IERC20(cirBtc).safeTransfer(deal.lender, collateralForLender);
            }
            if (collateralForBorrower > 0) {
                IERC20(cirBtc).safeTransfer(deal.borrower, collateralForBorrower);
            }
        } else {
            if (collateralAmount > 0) {
                IERC20(cirBtc).safeTransfer(deal.lender, collateralAmount);
            }
        }

        emit LoanLiquidated(dealId, msg.sender, btcUsdPrice, ltvBps);
    }

    function markDefault(bytes16 dealId) external nonReentrant {
        PersatDealRegistry.Deal memory deal = registry.getDeal(dealId);

        if (deal.state != PersatDealRegistry.DealState.Active) revert DealNotActive();
        if (block.timestamp <= deal.activatedAt + uint256(deal.durationMonths) * 30 days) revert DealNotActive();

        registry.setDealDefaulted(dealId);
        emit LoanDefaulted(dealId);
    }

    function rescueERC20(address token, address recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (token == cirBtc) revert CircBTCRescueBlocked();

        IERC20(token).safeTransfer(recipient, amount);
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }

    function setFeeBps(uint256 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFeeBps = feeBps;
        feeBps = feeBps_;
        emit FeeUpdated(oldFeeBps, feeBps_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _computeTermsHash(PersatDealRegistry.Deal memory deal) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                deal.dealId,
                deal.borrower,
                deal.lender,
                deal.principal,
                deal.collateral,
                deal.rateBps,
                deal.durationMonths
            )
        );
    }

    function _cirBtcToUsdcValue(uint256 cirBtcAmount, uint256 priceAnswer) internal view returns (uint256) {
        uint256 priceScaleTo6 = 10 ** (priceFeedDecimals - 6);
        return cirBtcAmount * priceAnswer / (10 ** cirBtcDecimals) / priceScaleTo6;
    }

    function _usdcToCirBtcAmount(uint256 usdcAmount, uint256 priceAnswer) internal view returns (uint256) {
        uint256 priceScaleTo6 = 10 ** (priceFeedDecimals - 6);
        return usdcAmount * (10 ** cirBtcDecimals) * priceScaleTo6 / priceAnswer;
    }
}
