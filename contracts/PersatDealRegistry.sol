// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PersatDealRegistry is Ownable2Step, Pausable, ReentrancyGuard {
    enum DealState {
        Proposed,
        Confirmed,
        Active,
        Completed,
        Defaulted,
        Liquidated,
        Cancelled
    }

    enum Visibility {
        Private,
        Public
    }

    struct Deal {
        bytes16 dealId;
        address borrower;
        address lender;
        uint256 principal;
        uint256 collateral;
        uint256 rateBps;
        uint8 durationMonths;
        Visibility visibility;
        DealState state;
        bytes32 termsHash;
        bytes32 claimToken;
        address reservedFor;
        uint256 activatedAt;
    }

    struct CounterOffer {
        uint256 offerId;
        address proposer;
        uint256 principal;
        uint256 collateral;
        uint256 rateBps;
        uint8 durationMonths;
        bool active;
    }

    error DealNotFound();
    error DealAlreadyExists();
    error InvalidState(DealState current, DealState required);
    error InvalidClaimToken();
    error ClaimTokenAlreadyUsed();
    error InvalidTerms();
    error Unauthorized();
    error MaxCounterOffersReached();
    error OfferNotFound();
    error ZeroAddress();
    error FeeTooHigh();
    error VaultAlreadySet();
    error NotVault();

    event DealProposed(bytes16 indexed dealId, address indexed proposer, Visibility visibility);
    event DealConfirmed(bytes16 indexed dealId, address indexed borrower, address indexed lender, bytes32 termsHash);
    event DealCancelled(bytes16 indexed dealId, address indexed cancelledBy);
    event CounterOfferSubmitted(bytes16 indexed dealId, uint256 indexed offerId, address indexed proposer);
    event CounterOfferCancelled(bytes16 indexed dealId, uint256 indexed offerId);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event VaultSet(address vault);

    mapping(bytes16 => Deal) public deals;
    mapping(bytes16 => CounterOffer[]) public counterOffers;
    mapping(bytes32 => bool) public usedClaimTokens;

    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 50;
    address public feeRecipient;
    address public vault;
    address public immutable usdc;
    address public immutable cirBtc;
    uint256 public constant MAX_COUNTER_OFFERS = 50;

    mapping(bytes16 => bool) private _dealExists;

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    constructor(address usdc_, address cirBtc_, address feeRecipient_, uint256 feeBps_, address initialOwner)
        Ownable(initialOwner)
    {
        if (usdc_ == address(0) || cirBtc_ == address(0) || feeRecipient_ == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();

        usdc = usdc_;
        cirBtc = cirBtc_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    function proposeDeal(
        bytes16 dealId,
        bool callerIsBorrower,
        address reservedFor,
        uint256 principal,
        uint256 collateral,
        uint256 rateBps,
        uint8 durationMonths,
        Visibility visibility,
        bytes32 salt
    ) external whenNotPaused {
        if (_dealExists[dealId]) revert DealAlreadyExists();
        if (principal == 0 || collateral == 0 || rateBps == 0 || durationMonths == 0) revert InvalidTerms();

        Deal storage deal = deals[dealId];
        deal.dealId = dealId;
        deal.principal = principal;
        deal.collateral = collateral;
        deal.rateBps = rateBps;
        deal.durationMonths = durationMonths;
        deal.visibility = visibility;
        deal.state = DealState.Proposed;

        if (callerIsBorrower) {
            deal.borrower = msg.sender;
            deal.lender = address(0);
        } else {
            deal.lender = msg.sender;
            deal.borrower = address(0);
        }

        if (visibility == Visibility.Private) {
            deal.reservedFor = reservedFor;
            deal.claimToken = keccak256(abi.encode(dealId, salt));
        } else {
            if (salt != bytes32(0)) revert InvalidClaimToken();
            deal.reservedFor = address(0);
            deal.claimToken = bytes32(0);
        }

        _dealExists[dealId] = true;

        emit DealProposed(dealId, msg.sender, visibility);
    }

    function claimDeal(bytes16 dealId, bytes32 salt) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Private) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);

        bytes32 expectedToken = keccak256(abi.encode(dealId, salt));
        if (deal.claimToken != expectedToken) revert InvalidClaimToken();
        if (usedClaimTokens[expectedToken]) revert ClaimTokenAlreadyUsed();
        if (deal.reservedFor != address(0) && msg.sender != deal.reservedFor) revert Unauthorized();

        if (deal.borrower == address(0) && deal.lender != address(0)) {
            deal.borrower = msg.sender;
        } else if (deal.lender == address(0) && deal.borrower != address(0)) {
            deal.lender = msg.sender;
        } else {
            revert InvalidTerms();
        }

        usedClaimTokens[expectedToken] = true;
        deal.claimToken = bytes32(0);
        deal.reservedFor = address(0);

        bytes32 termsHash = _computeTermsHash(deal);
        deal.termsHash = termsHash;
        deal.state = DealState.Confirmed;

        emit DealConfirmed(dealId, deal.borrower, deal.lender, termsHash);
    }

    function submitCounterOffer(
        bytes16 dealId,
        uint256 principal,
        uint256 collateral,
        uint256 rateBps,
        uint8 durationMonths
    ) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Public) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);
        if (counterOffers[dealId].length >= MAX_COUNTER_OFFERS) revert MaxCounterOffersReached();
        if (principal == 0 || collateral == 0 || rateBps == 0 || durationMonths == 0) revert InvalidTerms();

        uint256 offerId = counterOffers[dealId].length;
        counterOffers[dealId].push(
            CounterOffer({
                offerId: offerId,
                proposer: msg.sender,
                principal: principal,
                collateral: collateral,
                rateBps: rateBps,
                durationMonths: durationMonths,
                active: true
            })
        );

        emit CounterOfferSubmitted(dealId, offerId, msg.sender);
    }

    function acceptCounterOffer(bytes16 dealId, uint256 offerId) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Public) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);
        if (msg.sender != deal.borrower && msg.sender != deal.lender) revert Unauthorized();

        CounterOffer[] storage offers = counterOffers[dealId];
        if (offerId >= offers.length) revert OfferNotFound();

        CounterOffer storage selected = offers[offerId];
        if (!selected.active) revert OfferNotFound();

        deal.principal = selected.principal;
        deal.collateral = selected.collateral;
        deal.rateBps = selected.rateBps;
        deal.durationMonths = selected.durationMonths;

        if (msg.sender == deal.borrower) {
            deal.lender = selected.proposer;
        } else {
            deal.borrower = selected.proposer;
        }

        bytes32 termsHash = _computeTermsHash(deal);
        deal.termsHash = termsHash;
        deal.state = DealState.Confirmed;

        uint256 offersLength = offers.length;
        for (uint256 i = 0; i < offersLength; i++) {
            if (i == offerId) {
                offers[i].active = false;
                continue;
            }
            if (offers[i].active) {
                offers[i].active = false;
                emit CounterOfferCancelled(dealId, offers[i].offerId);
            }
        }

        emit DealConfirmed(dealId, deal.borrower, deal.lender, termsHash);
    }

    function cancelDeal(bytes16 dealId) external {
        Deal storage deal = _getDealStorage(dealId);

        if (msg.sender != deal.borrower && msg.sender != deal.lender) revert Unauthorized();
        if (deal.state != DealState.Proposed && deal.state != DealState.Confirmed) {
            revert InvalidState(deal.state, DealState.Proposed);
        }

        deal.state = DealState.Cancelled;
        emit DealCancelled(dealId, msg.sender);
    }

    function setDealActive(bytes16 dealId, uint256 activatedAt) external onlyVault {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.state != DealState.Confirmed) revert InvalidState(deal.state, DealState.Confirmed);
        if (deal.termsHash != _computeTermsHash(deal)) revert InvalidTerms();

        deal.state = DealState.Active;
        deal.activatedAt = activatedAt;
    }

    function setDealCompleted(bytes16 dealId) external onlyVault {
        Deal storage deal = _getDealStorage(dealId);
        if (deal.state != DealState.Active && deal.state != DealState.Defaulted) {
            revert InvalidState(deal.state, DealState.Active);
        }
        deal.state = DealState.Completed;
    }

    function setDealLiquidated(bytes16 dealId) external onlyVault {
        Deal storage deal = _getDealStorage(dealId);
        if (deal.state != DealState.Active && deal.state != DealState.Defaulted) {
            revert InvalidState(deal.state, DealState.Active);
        }
        deal.state = DealState.Liquidated;
    }

    function setDealDefaulted(bytes16 dealId) external onlyVault {
        Deal storage deal = _getDealStorage(dealId);
        if (deal.state != DealState.Active) revert InvalidState(deal.state, DealState.Active);
        deal.state = DealState.Defaulted;
    }

    function setVault(address vault_) external onlyOwner {
        if (vault == address(0)) {
            if (vault_ == address(0)) revert ZeroAddress();
            vault = vault_;
            emit VaultSet(vault_);
            return;
        }
        revert VaultAlreadySet();
    }

    function setFeeBps(uint256 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFeeBps = feeBps;
        feeBps = feeBps_;
        emit FeeUpdated(oldFeeBps, feeBps_);
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getDeal(bytes16 dealId) external view returns (Deal memory) {
        Deal memory deal = deals[dealId];
        if (!_dealExists[dealId]) revert DealNotFound();
        return deal;
    }

    function getCounterOffers(bytes16 dealId) external view returns (CounterOffer[] memory) {
        if (!_dealExists[dealId]) revert DealNotFound();
        return counterOffers[dealId];
    }

    function computeTermsHash(bytes16 dealId) external view returns (bytes32) {
        Deal storage deal = _getDealStorage(dealId);
        return _computeTermsHash(deal);
    }

    function _getDealStorage(bytes16 dealId) internal view returns (Deal storage deal) {
        if (!_dealExists[dealId]) revert DealNotFound();
        deal = deals[dealId];
    }

    function _computeTermsHash(Deal storage deal) internal view returns (bytes32) {
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
}
