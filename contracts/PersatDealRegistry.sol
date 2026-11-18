// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

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
    error VaultAlreadySet();
    error NotVault();
    error InvalidDealId();
    error SignatureRequired();
    error InvalidSignature();
    error SelfMatch();
    error DealExpired();
    error ActiveOfferExists();
    error ActivationWindowClosed();

    event DealProposed(bytes16 indexed dealId, address indexed proposer, Visibility visibility);
    event DealConfirmed(bytes16 indexed dealId, address indexed borrower, address indexed lender, bytes32 termsHash);
    event DealCancelled(bytes16 indexed dealId, address indexed cancelledBy);
    event CounterOfferSubmitted(bytes16 indexed dealId, uint256 indexed offerId, address indexed proposer);
    event CounterOfferWithdrawn(bytes16 indexed dealId, uint256 indexed offerId, address indexed proposer);
    event VaultSet(address vault);

    mapping(bytes16 => Deal) public deals;
    mapping(bytes16 => CounterOffer[]) public counterOffers;
    mapping(bytes32 => bool) public usedClaimTokens;

    address public vault;
    address public immutable usdc;
    address public immutable cirBtc;
    uint256 public constant MAX_COUNTER_OFFERS = 50;
    uint256 public constant PROPOSAL_TTL = 30 days;
    uint256 public constant ACTIVATION_WINDOW = 72 hours;

    mapping(bytes16 => uint256) public proposedAt;
    mapping(bytes16 => uint256) public confirmedAt;
    mapping(bytes16 => uint256) public activeCounterOffers;
    mapping(bytes16 => mapping(address => bool)) public hasActiveOffer;

    mapping(address => bytes16[]) private _userDeals;
    bytes16[] private _publicDeals;

    bytes32 public constant CLAIM_TYPEHASH = keccak256("PersatFinance.ClaimDeal");

    mapping(bytes16 => address) public claimSigner;

    mapping(bytes16 => bool) private _dealExists;

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    constructor(address usdc_, address cirBtc_, address initialOwner) Ownable(initialOwner) {
        if (usdc_ == address(0) || cirBtc_ == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }

        usdc = usdc_;
        cirBtc = cirBtc_;
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
        if (bytes8(dealId) != dealIdPrefix(msg.sender)) revert InvalidDealId();
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
            if (reservedFor == msg.sender) revert SelfMatch();
            deal.reservedFor = reservedFor;
            deal.claimToken = keccak256(abi.encode(dealId, salt));
            if (reservedFor == address(0)) {
                if (uint256(salt) >> 160 != 0 || uint256(salt) == 0) revert InvalidClaimToken();
                claimSigner[dealId] = address(uint160(uint256(salt)));
            }
        } else {
            if (salt != bytes32(0)) revert InvalidClaimToken();
            deal.reservedFor = address(0);
            deal.claimToken = bytes32(0);
        }

        _dealExists[dealId] = true;
        proposedAt[dealId] = block.timestamp;
        _userDeals[msg.sender].push(dealId);
        if (visibility == Visibility.Public) {
            _publicDeals.push(dealId);
        } else if (reservedFor != address(0)) {
            _userDeals[reservedFor].push(dealId);
        }

        emit DealProposed(dealId, msg.sender, visibility);
    }

    function claimDeal(bytes16 dealId, bytes32 salt) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Private) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);
        if (isExpired(dealId)) revert DealExpired();

        if (claimSigner[dealId] != address(0)) revert SignatureRequired();

        bytes32 expectedToken = keccak256(abi.encode(dealId, salt));
        if (deal.claimToken != expectedToken) revert InvalidClaimToken();
        if (usedClaimTokens[expectedToken]) revert ClaimTokenAlreadyUsed();
        if (deal.reservedFor != address(0) && msg.sender != deal.reservedFor) revert Unauthorized();

        _bindClaimer(dealId, deal, expectedToken);
    }

    function claimDealWithSignature(bytes16 dealId, bytes calldata signature) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Private) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);
        if (isExpired(dealId)) revert DealExpired();

        address signer = claimSigner[dealId];
        if (signer == address(0)) revert InvalidClaimToken();

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(claimDigest(dealId, msg.sender));
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered != signer) revert InvalidSignature();

        bytes32 token = deal.claimToken;
        if (usedClaimTokens[token]) revert ClaimTokenAlreadyUsed();
        delete claimSigner[dealId];

        _bindClaimer(dealId, deal, token);
    }

    function _bindClaimer(bytes16 dealId, Deal storage deal, bytes32 usedToken) internal {
        if (msg.sender == deal.borrower || msg.sender == deal.lender) revert SelfMatch();
        if (deal.reservedFor == address(0)) _userDeals[msg.sender].push(dealId);
        if (deal.borrower == address(0) && deal.lender != address(0)) {
            deal.borrower = msg.sender;
        } else if (deal.lender == address(0) && deal.borrower != address(0)) {
            deal.lender = msg.sender;
        } else {
            revert InvalidTerms();
        }

        usedClaimTokens[usedToken] = true;
        deal.claimToken = bytes32(0);
        deal.reservedFor = address(0);

        bytes32 termsHash = _computeTermsHash(deal);
        deal.termsHash = termsHash;
        deal.state = DealState.Confirmed;
        confirmedAt[dealId] = block.timestamp;

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
        if (isExpired(dealId)) revert DealExpired();
        if (msg.sender == deal.borrower || msg.sender == deal.lender) revert SelfMatch();
        if (hasActiveOffer[dealId][msg.sender]) revert ActiveOfferExists();
        if (activeCounterOffers[dealId] >= MAX_COUNTER_OFFERS) revert MaxCounterOffersReached();
        if (principal == 0 || collateral == 0 || rateBps == 0 || durationMonths == 0) revert InvalidTerms();

        hasActiveOffer[dealId][msg.sender] = true;
        activeCounterOffers[dealId] += 1;

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

    function cancelCounterOffer(bytes16 dealId, uint256 offerId) external {
        Deal storage deal = _getDealStorage(dealId);
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);

        CounterOffer[] storage offers = counterOffers[dealId];
        if (offerId >= offers.length) revert OfferNotFound();
        CounterOffer storage offer = offers[offerId];
        if (!offer.active) revert OfferNotFound();
        if (offer.proposer != msg.sender) revert Unauthorized();

        offer.active = false;
        hasActiveOffer[dealId][msg.sender] = false;
        activeCounterOffers[dealId] -= 1;
        emit CounterOfferWithdrawn(dealId, offerId, msg.sender);
    }

    function acceptCounterOffer(bytes16 dealId, uint256 offerId) external whenNotPaused {
        Deal storage deal = _getDealStorage(dealId);

        if (deal.visibility != Visibility.Public) revert InvalidTerms();
        if (deal.state != DealState.Proposed) revert InvalidState(deal.state, DealState.Proposed);
        if (isExpired(dealId)) revert DealExpired();
        if (msg.sender != deal.borrower && msg.sender != deal.lender) revert Unauthorized();

        CounterOffer[] storage offers = counterOffers[dealId];
        if (offerId >= offers.length) revert OfferNotFound();

        CounterOffer storage selected = offers[offerId];
        if (!selected.active) revert OfferNotFound();
        if (selected.proposer == msg.sender) revert SelfMatch();

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
        confirmedAt[dealId] = block.timestamp;

        selected.active = false;
        hasActiveOffer[dealId][selected.proposer] = false;
        activeCounterOffers[dealId] -= 1;
        _userDeals[selected.proposer].push(dealId);

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
        if (block.timestamp > confirmedAt[dealId] + ACTIVATION_WINDOW) revert ActivationWindowClosed();

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

    function isExpired(bytes16 dealId) public view returns (bool) {
        return deals[dealId].state == DealState.Proposed && block.timestamp > proposedAt[dealId] + PROPOSAL_TTL;
    }

    function activationDeadline(bytes16 dealId) external view returns (uint256) {
        if (deals[dealId].state != DealState.Confirmed) return 0;
        return confirmedAt[dealId] + ACTIVATION_WINDOW;
    }

    function counterOfferCount(bytes16 dealId) external view returns (uint256) {
        return counterOffers[dealId].length;
    }

    function userDealCount(address user) external view returns (uint256) {
        return _userDeals[user].length;
    }

    function getUserDeals(address user, uint256 offset, uint256 limit) external view returns (bytes16[] memory) {
        return _slice(_userDeals[user], offset, limit);
    }

    function publicDealCount() external view returns (uint256) {
        return _publicDeals.length;
    }

    function getPublicDeals(uint256 offset, uint256 limit) external view returns (bytes16[] memory) {
        return _slice(_publicDeals, offset, limit);
    }

    function _slice(bytes16[] storage list, uint256 offset, uint256 limit) internal view returns (bytes16[] memory out) {
        uint256 len = list.length;
        if (offset >= len) return new bytes16[](0);
        uint256 end = offset + limit > len ? len : offset + limit;
        out = new bytes16[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = list[i];
        }
    }

    function dealIdPrefix(address proposer) public pure returns (bytes8) {
        return bytes8(keccak256(abi.encode(proposer)));
    }

    function claimDigest(bytes16 dealId, address claimer) public view returns (bytes32) {
        return keccak256(abi.encode(CLAIM_TYPEHASH, block.chainid, address(this), dealId, claimer));
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
