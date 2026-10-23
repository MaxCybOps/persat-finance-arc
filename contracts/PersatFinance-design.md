# Persat Finance — Smart Contract Design Document

**Status:** Draft  
**Authors:** Persat Labs Limited  
**Target Chain:** Arc Testnet (Chain ID 5042002) → Arc Mainnet (Chain ID 5042)  
**Language / Toolchain:** Solidity ^0.8.24, Foundry (forge)  
**Version:** 2.0 — Global, Single Oracle, Dual-Path Model  
**Milestone:** MVP  

**Review Tracker:**
- [ ] Design Review (TBD)
- [ ] Security Review (TBD)
- [ ] Ops Review (TBD)
- [ ] Data Review (TBD)
- [ ] Compliance Review (TBD)

---

## Action Items (living)

_Starts empty — filled per review round._

---

## 1. Goals / Non-Goals

### Goals

- Provide a fully non-custodial peer-to-peer Bitcoin-collateralised lending protocol on Arc Testnet (with path to mainnet).
- Two discovery paths converging on the same on-chain deal object: **Private Deal Links** (single-use claim token) and **Open Marketplace** (public order book with structured counter-offers only).
- Atomic loan activation: collateral lock + principal disbursal in a single transaction.
- Automated, permissionless liquidation when LTV exceeds 80%, driven by an on-chain BTC/USD price oracle (Pyth on testnet; Chainlink BTC/USD proxy `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De` on mainnet).
- Repayment returns principal + interest to the lender and releases cirBTC to the borrower atomically.
- Zero "god-mode" operator keys — all state transitions governed by on-chain math and explicit party consent.
- Protocol fee collected at activation (configurable, never exceeding a hard cap).

### Non-Goals

- Pooled liquidity or yield aggregation (pure P2P, no AMM).
- Multi-hop or cross-chain collateral (single-chain Arc only).
- Free-text messaging or any off-chain orderbook — counter-offers are strictly structured (amount, rate, duration, LTV). No social or reputation scoring at MVP.
- Upgradeable proxy architecture at MVP — immutable contracts, migration path via new deployment + dual-run.
- Local-currency stablecoins or fiat on-ramps.
- De-peg detection for USDC/USDT at MVP (USDC treated as exactly $1; deferred to post-MVP hardening).
- Governance token or protocol-owned liquidity.

---

## 2. Requirements

### Functional

1. **Deal Registry** stores a unique `bytes16 dealId`, borrower, lender, principal (USDC 6-decimal ERC-20), collateral amount (cirBTC), `rateBps`, `durationMonths`, `visibility` (Private | Public), and a `DealState` enum.
2. **Private path:** Initiator creates deal with a visibility=Private flag. A 32-byte claim token (off-chain derived, but verified on-chain as keccak256 of `dealId ++ salt`) is embedded in the claim URL. Counterparty calls `claimDeal(dealId, token)` which binds their wallet and transitions to Confirmed, invalidating the token (single-use).
3. **Public path:** Initiator creates deal with visibility=Public. Any wallet may submit a structured counter-offer `(amount, rateBps, durationMonths)`. Initiator accepts exactly one counter-offer, which transitions to Confirmed and cancels all others.
4. **Terms hash** computed as `keccak256(abi.encode(dealId, borrower, lender, principal, collateral, rateBps, durationMonths))` at Confirmed transition; stored immutably; must match at every subsequent state change.
5. **Atomic activation:** single call deposits cirBTC from borrower into vault, transfers USDC principal from lender to borrower, deducts protocol fee.
6. **Repayment:** borrower repays `principal + interest`; interest = `principal * rateBps * durationMonths / (10000 * 12)`; contract releases cirBTC to borrower and USDC to lender atomically.
7. **Liquidation:** permissionless call when `collateral_usd_value / principal < 1 / liquidationThreshold (80%)`. Lender receives USDC equivalent of collateral, excess collateral (if any) returned to borrower.
8. **Protocol fee:** collected at activation, configurable by `feeAdmin` up to `MAX_FEE_BPS` (e.g. 50 bps = 0.5%).

### Security

- No path lets an unpermissioned caller cancel a Private deal before Funding.
- The terms hash must be verified before every fund movement; tampered terms revert.
- Oracle staleness must be checked before any liquidation; stale oracle reverts the liquidation.
- Re-entrancy protected on every external-call site (CEI + `nonReentrant`).
- Protocol fee must never exceed `MAX_FEE_BPS`.
- Zero-address checks on all critical constructor and function args.
- `SafeERC20` for all token transfers.

---

## 3. Terminology & Actors

| Term | Definition |
|------|------------|
| **Deal** | A bilateral agreement recorded on-chain: one borrower, one lender, fixed terms |
| **cirBTC** | Circle's native Bitcoin representation on Arc (ERC-20 collateral token) |
| **Principal** | USDC amount the lender disburses to the borrower |
| **Collateral** | cirBTC amount the borrower locks in the vault |
| **LTV** | Loan-to-Value = `principal_usd / collateral_usd`; must stay below liquidation threshold |
| **rateBps** | Annual interest rate in basis points (1 bps = 0.01%) |
| **durationMonths** | Fixed loan term in whole months |
| **claimToken** | Single-use 32-byte token embedded in a private deal-link URL |
| **termsHash** | `keccak256` of all deal parameters; computed at Confirmed; guards integrity forever |
| **liquidationThreshold** | LTV floor (80% at launch) above which permissionless liquidation is allowed |
| **feeAdmin** | Role-holder who may adjust `feeBps` within the hard cap |

| Actor | On/Off-chain | Trust Level | Capabilities |
|-------|-------------|-------------|--------------|
| **Borrower** | On-chain | Untrusted | Propose private/public deal, claim private deal as borrower, deposit collateral, repay loan |
| **Lender** | On-chain | Untrusted | Propose private/public deal, claim private deal as lender, confirm public counter-offer match, disburse USDC |
| **Liquidator** | On-chain | Untrusted | Call liquidate when LTV exceeds threshold; no special key required |
| **feeAdmin** | On-chain | Semi-trusted | Set `feeBps` within `MAX_FEE_BPS`; cannot move funds |
| **feeRecipient** | On-chain | Semi-trusted | Receives protocol fee; set at deploy; changeable by `feeAdmin` |
| **Price Oracle** | On-chain | Semi-trusted | Chainlink proxy (mainnet) / Pyth (testnet) — staleness-guarded |
| **Keeper bot** | Off-chain | Untrusted (relayer only) | Monitors for liquidatable positions and calls permissionless liquidate |

---

## 4. Language / Runtime

- **Solidity ^0.8.24** — built-in overflow/underflow checks, custom errors, `block.timestamp` available.
- **EVM target:** Paris (`foundry.toml` pins `evm_version = "paris"` on Arc Studio).
- **Foundry (forge)** — testing, deployment, and gas reports.
- **OpenZeppelin 5.1.0** (pinned in sandbox) — `ReentrancyGuard`, `SafeERC20`, `Ownable2Step`, `Pausable`, `IERC20`.
  - Note: OZ ≥5.2.0 uses `mcopy` (Cancun-only) in `Bytes.sol`; stay on 5.1.0 for Paris EVM compatibility.
- **No upgradeable proxies at MVP** — immutable contracts chosen for simplicity and auditability.

---

## 5. Transaction & Execution Model

All state changes are atomic EVM transactions: either all state is committed or all is reverted. There is no intermediate state where one party's funds are at risk without the other's commitment being on-chain.

**Re-entrancy surface:**
- `activateLoan` — calls two ERC-20 `transferFrom` + one `transfer`. CEI: state set to Active before transfers. `nonReentrant` applied.
- `repayLoan` — calls ERC-20 `transferFrom` (borrower) + `transfer` (lender) + `transfer` (borrower collateral release). CEI + `nonReentrant`.
- `liquidate` — calls oracle, then transfers. CEI + `nonReentrant`.

No raw ETH/native value is transferred to `address(0)` (Arc reverts on this).

---

## 6. Arc Network Specifics

| Item | Value |
|------|-------|
| Chain ID (testnet) | 5042002 |
| RPC | https://rpc.testnet.arc.io |
| Explorer | https://explorer.testnet.arc.io |
| Native gas token | USDC (18-decimal native view; ERC-20 view: 6 decimals at `0x3600000000000000000000000000000000000000`) |
| ERC-20 USDC decimals | 6 |
| cirBTC | ERC-20 collateral token (address TBD, user-supplied at deploy) |
| Min gas price | 20 Gwei (`maxFeePerGas` floor) |

**Oracle strategy:**
- **Arc Testnet:** Pyth BTC/USD (only BTC/USD feed is kept fresh on Arc testnet as of 2026-09-14; staleness threshold set conservatively at 3600s).
- **Arc Mainnet:** Chainlink BTC/USD proxy `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De`, 8 decimals, 86400s heartbeat, 0.5% deviation.
- **Design decision:** The oracle address and staleness threshold are constructor-injectable (immutable post-deploy). The contract calls `decimals()` and normalises the price to 8 decimals internally. Mainnet deployment will pass the Chainlink proxy; testnet will pass the Pyth adapter address.
- Contracts import a minimal `IPriceFeed` interface (`latestRoundData` compatible with Chainlink AggregatorV3Interface). A Pyth adapter contract wraps Pyth's `getPriceUnsafe` to expose the same interface. **Always call `decimals()`; never hardcode 8.**

---

## 7. Architecture Overview

```mermaid
sequenceDiagram
    participant B as Borrower
    participant L as Lender
    participant R as PersatDealRegistry
    participant V as PersatEscrowVault
    participant Oracle as PriceFeed (Chainlink/Pyth)
    participant USDC as USDC ERC-20
    participant cirBTC as cirBTC ERC-20

    Note over B,L: Path A — Private Deal Link
    B->>R: proposeDeal(terms, visibility=Private, claimToken)
    L->>R: claimDeal(dealId, claimToken)  // binds lender, state→Confirmed
    B->>V: activateLoan(dealId)
    V->>cirBTC: transferFrom(borrower, vault, collateral)
    V->>USDC: transferFrom(lender, borrower, principal - fee)
    V->>USDC: transferFrom(lender, feeRecipient, fee)
    Note over V: state → Active, termsHash locked

    Note over B,L: Repayment
    B->>V: repayLoan(dealId)
    V->>USDC: transferFrom(borrower, lender, principal + interest)
    V->>cirBTC: transfer(borrower, collateral)
    Note over V: state → Completed

    Note over B,L: Liquidation (permissionless)
    Oracle-->>V: BTC/USD price (checked for staleness)
    V->>V: compute LTV; require LTV > liquidationThreshold
    V->>USDC: transfer(lender, debtUsd)
    V->>cirBTC: transfer(borrower, excessCollateral)
    Note over V: state → Liquidated
```

**Flow of Funds:**

| Step | Who moves what | Invariant |
|------|---------------|-----------|
| Activation — collateral deposit | cirBTC: borrower → vault | vault.cirBTC += collateral |
| Activation — principal disbursal | USDC: lender → borrower | borrower.USDC += principal − fee |
| Activation — fee | USDC: lender → feeRecipient | feeRecipient.USDC += fee |
| Repayment — interest+principal | USDC: borrower → lender | lender.USDC += principal+interest |
| Repayment — collateral release | cirBTC: vault → borrower | vault.cirBTC -= collateral |
| Liquidation — debt repay | USDC vault allowance → lender | lender made whole in USDC |
| Liquidation — excess collateral | cirBTC: vault → borrower | no cirBTC stranded in vault |

**Resting-state invariant:** The vault holds cirBTC only for Active deals. For Completed, Liquidated, or Cancelled deals the vault holds zero cirBTC for that deal.

**Dependencies:**
- USDC ERC-20 at `0x3600000000000000000000000000000000000000` (Arc, both networks).
- cirBTC ERC-20 (address passed at deploy).
- IPriceFeed oracle (address passed at deploy; Pyth adapter or Chainlink proxy).

---

## 8. Contract Design

### 8.1 PersatDealRegistry

#### Roles

| Role | Count/Holder | Permissions | Why |
|------|-------------|-------------|-----|
| `owner` (Ownable2Step) | 1 — deployer (feeAdmin EOA) | Set `feeBps`, `feeRecipient`; pause/unpause; set oracle; emergency rescue of stuck tokens | Admin functions only; cannot move deal funds |
| `borrower` | Per deal | Propose, cancel (pre-Funding), repay | Party to the deal |
| `lender` | Per deal | Claim (private) or accept counter-offer (public), cancel (pre-Funding) | Party to the deal |
| `liquidator` | Any EOA | Call `liquidate` when LTV condition met | Permissionless enforcement |

#### State Variables

```
mapping(bytes16 => Deal) public deals;
mapping(bytes32 => bool) public usedClaimTokens;   // prevent replay of claim tokens
uint256 public feeBps;         // current fee in bps
uint256 public constant MAX_FEE_BPS = 50;
address public feeRecipient;
bool public paused;
```

#### Deal Struct

```solidity
struct Deal {
    bytes16   dealId;
    address   borrower;
    address   lender;
    uint256   principal;        // USDC, 6-decimal ERC-20 units
    uint256   collateral;       // cirBTC, 18-decimal ERC-20 units
    uint256   rateBps;          // annual interest in bps
    uint8     durationMonths;
    Visibility visibility;      // Private | Public
    DealState state;
    bytes32   termsHash;        // locked at Confirmed; verified at every fund movement
    bytes32   claimToken;       // for Private deals; zeroed after use
    uint256   activatedAt;      // block.timestamp at activation
}
```

#### DealState Enum

`Proposed → Confirmed → Active → Completed | Defaulted | Liquidated | Cancelled`

#### Key Write Functions

| Function | Caller | State Change | Events | Reverts When |
|----------|--------|-------------|--------|--------------|
| `proposeDeal(...)` | borrower or lender | Creates Deal in Proposed | `DealProposed` | zero address, zero amount, zero rate, zero duration |
| `claimDeal(dealId, token)` | counterparty (private) | Sets lender/borrower, state→Confirmed, termsHash locked | `DealConfirmed` | token mismatch, token already used, deal not Proposed, wrong visibility |
| `submitCounterOffer(dealId, amount, rateBps, durationMonths)` | any address (public) | Adds CounterOffer record | `CounterOfferSubmitted` | deal not Public/Proposed, deal already Confirmed |
| `acceptCounterOffer(dealId, offerId)` | original proposer | Sets counterparty, updates terms, state→Confirmed, termsHash locked, cancels other offers | `DealConfirmed`, `CounterOfferCancelled` | not proposer, offer not found, deal not Public/Proposed |
| `cancelDeal(dealId)` | borrower or lender | state→Cancelled | `DealCancelled` | state not Proposed or Confirmed (pre-Funding) |

### 8.2 PersatEscrowVault

#### Key Write Functions

| Function | Caller | State Change | Events | Reverts When |
|----------|--------|-------------|--------|--------------|
| `activateLoan(dealId)` | borrower | state→Active; cirBTC in; USDC out; fee out | `LoanActivated` | state not Confirmed, termsHash mismatch, zero address, insufficient allowances |
| `repayLoan(dealId)` | borrower | state→Completed; USDC in; cirBTC out | `LoanRepaid` | state not Active, termsHash mismatch, insufficient USDC allowance |
| `liquidate(dealId)` | anyone | state→Liquidated; cirBTC seized; USDC to lender; excess cirBTC to borrower | `LoanLiquidated` | state not Active, LTV healthy, oracle stale, termsHash mismatch |
| `markDefault(dealId)` | anyone (after term expiry) | state→Defaulted | `LoanDefaulted` | state not Active, not past maturity |

---

## 9. Security Considerations

| Vulnerability | Applicable? | Mitigation |
|--------------|-------------|------------|
| Reentrancy | Yes — activateLoan, repayLoan, liquidate all make external calls | CEI ordering (state set before transfers) + `nonReentrant` on all three |
| Access control | Yes — deal-state transitions must be party-gated | `msg.sender` checks at each state gate; permissionless only for liquidate/markDefault |
| Integer overflow/underflow | Solidity ≥0.8 checked | No `unchecked` blocks; interest math uses standard checked arithmetic |
| Unchecked ERC-20 return | Yes | `SafeERC20.safeTransferFrom` / `safeTransfer` on all token moves |
| Fee-on-transfer / rebasing | cirBTC could theoretically be rebasing | Balance-delta assertion: measure vault.cirBTC before and after deposit; use delta, not stated amount |
| Claim token replay | Yes — single-use tokens must be invalidated | `usedClaimTokens[token] = true` before state change |
| Terms hash tampering | Yes — terms must be immutable after Confirmed | `termsHash` computed and stored at Confirmed; checked before every fund movement |
| Flash-loan / price manipulation | Yes — oracle used for liquidation | Only Chainlink/Pyth aggregator price; staleness guard; no spot DEX price |
| Oracle staleness | Yes | `require(block.timestamp - updatedAt <= stalenessThreshold, OracleStale)` |
| Denial of service | Bounded loops in counter-offer cancellation | Cap `MAX_COUNTER_OFFERS` per deal (e.g. 50); emit events instead of storing all cancelled |
| Timestamp dependence | Used for maturity / default check | Tolerance is months-scale; not used for randomness; safe |
| Approval persistence | Lender must pre-approve vault for principal; borrower for collateral | Pull-only pattern; approvals are per-activation only; no standing max approvals stored by this contract |
| Centralization risk | `feeAdmin` / `owner` can change fee | Cap enforced (`MAX_FEE_BPS`); cannot move deal funds; Ownable2Step prevents accidental transfer |
| address(0) native transfer | Arc reverts on native send to 0x0 | Zero-address checks on `feeRecipient`, `borrower`, `lender` at all entry points |
| 20 Gwei gas floor | Keeper/liquidation tx must clear floor | Documented; liquidation is permissionless — any caller who sets ≥20 Gwei `maxFeePerGas` succeeds |
| USDC 6-decimal vs native 18-decimal confusion | Yes — Arc duality | All principal/interest math uses 6-decimal ERC-20 USDC only; `msg.value` is never used in these contracts |
| cirBTC decimals unknown at compile time | Yes | `cirBTC.decimals()` read at construction and stored; collateral math normalised accordingly |

---

## 10. Trust Model & Threat Analysis

| Actor | Max damage if compromised | Mitigation | Detection |
|-------|--------------------------|------------|-----------|
| `owner` / `feeAdmin` | Change fee up to 50 bps, change feeRecipient, pause protocol | Fee capped at `MAX_FEE_BPS`; cannot touch deal funds; Ownable2Step — 2 txs to transfer | Monitor `OwnershipTransferStarted`, `FeeUpdated` events |
| Price oracle | Manipulated BTC price could trigger false liquidation or block legitimate ones | Only accept prices within deviation bounds (secondary staleness heuristic); liquidation delay TBD post-MVP | Monitor `LoanLiquidated` with anomalous prices |
| Lender | Front-run repayment to extract collateral | Only vault executes repayment logic; lender cannot call repay | N/A — math-governed |
| Borrower | Walk away post-activation (default risk) | Collateral locked in vault; liquidation permissionless after LTV breach or term expiry | Monitor `LoanDefaulted` |
| Liquidator | Grief (call too early / too late) | LTV check is on-chain math — call only succeeds if condition met | N/A — call reverts if premature |

---

## 11. Emergency Response

- **Pause:** `owner` can pause `activateLoan`, `repayLoan`, and `liquidate` (new activations / repayments / liquidations blocked; existing Active loans unaffected in storage).
- **Token rescue:** `owner` can call `rescueERC20(token, recipient, amount)` for any token that is NOT a currently-locked cirBTC amount (deal-locked collateral is non-rescuable).
- **Fee drain prevention:** `MAX_FEE_BPS` is a compile-time constant; no override path exists.

---

## 12. Deployment & Initialization

**PersatDealRegistry constructor args:**
- `address usdc` — USDC ERC-20 (`0x3600000000000000000000000000000000000000`)
- `address cirBtc` — cirBTC ERC-20 (user-supplied)
- `address vault` — PersatEscrowVault address (set after vault deployed)
- `address feeRecipient_`
- `uint256 feeBps_` (≤ 50)
- `address initialOwner`

**PersatEscrowVault constructor args:**
- `address registry` — PersatDealRegistry address
- `address usdc`
- `address cirBtc`
- `address priceFeed` — oracle address
- `uint256 stalenessThreshold` — e.g. 3600 (testnet Pyth), 86400 (mainnet Chainlink)
- `uint256 liquidationThresholdBps` — 8000 (= 80%)
- `address feeRecipient_`
- `uint256 feeBps_`
- `address initialOwner`

**Deploy order:** Registry first (vault address not yet known), then Vault (pass Registry address), then call `registry.setVault(vault)` to wire the two contracts.

**Key at genesis:** `initialOwner` = deployer wallet (testnet); recommend multisig (mainnet).

---

## 13. Upgradeability

**Not upgradeable at MVP.** Immutable contracts chosen for auditability and simplicity.

**Migration story:** If a bug fix is required post-deploy, deploy new contract versions, run both contracts in parallel for any active loans, and signal all new originations to the new contracts via a UI-level registry switch. Completed/Liquidated loans on old contracts remain readable forever.

---

## 14. Key Management & Signing

- No off-chain signatures required for the MVP on-chain flow — every action is a direct transaction.
- Claim tokens are derived off-chain as `keccak256(abi.encode(dealId, salt))` where `salt` is a random 32-byte value the frontend generates at deal creation. The salt is never stored on-chain; only the token hash is committed.
- **Replay protection for claim tokens:** `usedClaimTokens[token] = true` at the moment of claim.

---

## 15. Failure Scenarios

| Scenario | What happens | Invariant preserved? |
|----------|-------------|---------------------|
| Oracle goes stale | `liquidate` reverts with `OracleStale` | Yes — no liquidation on bad data |
| Lender never disburses USDC (insufficient allowance) | `activateLoan` reverts; state stays Confirmed; cirBTC never leaves borrower | Yes |
| Borrower never repays (past maturity) | Any caller invokes `markDefault`; state→Defaulted; lender can initiate liquidation via `liquidate` | Yes |
| LTV breaches 80% before maturity | Permissionless liquidation; lender reimbursed first, excess collateral returned to borrower | Yes |
| Fee recipient is a contract that rejects transfers | `safeTransfer` reverts; activation fails; state unchanged | Yes — no partial activation |
| Counter-offer cap exceeded | New offer submission reverts; existing offers unaffected | Yes |

---

## 16. Testing Strategy

- **Unit tests (Foundry `.t.sol`):** 100% branch coverage target on state-machine transitions; fuzz `rateBps`, `durationMonths`, `principal`, and `collateral` amounts; invariant: vault cirBTC balance equals sum of Active deal collaterals.
- **Integration tests:** Fork Arc Testnet (or local anvil with mocked tokens); end-to-end happy path for both Private and Public paths; liquidation scenario with mocked oracle price.
- **Static analysis:** Slither on production contracts.
- **Run full suite:** `cd contracts && forge test --gas-report`

---

## 17. Third-Party Libraries

| Library | Version | Dependency? | Why | Security reviewed? |
|---------|---------|-------------|-----|--------------------|
| `@openzeppelin/contracts` | 5.1.0 | Yes (pinned) | `ReentrancyGuard`, `SafeERC20`, `Ownable2Step`, `Pausable` | Yes (OZ audit history) |
| Chainlink AggregatorV3Interface | Interface only (inline) | No npm dep | BTC/USD price feed consumer | Interface only — no logic |
| Pyth SDK | Interface only (inline) | No npm dep | Testnet oracle adapter | Interface only |

---

## 18. Priorities & Tradeoffs

| Decision | Tradeoff | Rationale |
|----------|----------|-----------|
| Immutable contracts (no proxy) | Harder to fix post-deploy; requires migration | Simpler mental model, no proxy storage collision risk, audit surface is smaller |
| Single oracle (no dual-oracle) | De-peg of USDC not detected at MVP | USDC treated as $1 for MVP; deferred hardening acceptable |
| Pull-only repayment (borrower initiates) | Lender cannot force repayment | Matches "no god-mode" principle; `markDefault` gives lender recourse |
| Cap `MAX_COUNTER_OFFERS = 50` | Large order books not supported | Bounded gas; acceptable for MVP P2P model |
| Pyth on testnet / Chainlink on mainnet | Two different oracle interfaces | Wrapped behind `IPriceFeed` adapter; swap at deploy time with no contract changes |
| Fixed interest (not floating) | Cannot adjust to market conditions mid-loan | Agreed up-front; simpler math; correct for P2P bilateral loans |

---

## 19. Monitoring & Alerting

| Event | Threshold | Severity | Playbook |
|-------|-----------|----------|----------|
| `LoanLiquidated` with price anomaly | BTC/USD > 20% single-block move | High | Review oracle feed; pause if manipulation suspected |
| `OwnershipTransferStarted` | Any | High | Verify intended transfer; cancel if unexpected |
| `FeeUpdated` | fee > 30 bps | Medium | Review governance decision |
| `LoanDefaulted` | Any | Medium | Alert lender to initiate liquidation |
| `OracleStale` reverts cluster | >5 in 10 min | High | Oracle liveness incident; check Pyth/Chainlink |

---

## 20. Cross-Functional Stakeholders

| Stakeholder | Owns |
|-------------|------|
| Persat Labs engineering | Contract correctness, deploy ops |
| Security reviewer | STEP 3 + Slither findings |
| Frontend team | Claim-link URL generation, structured counter-offer UI, LTV calculator |
| Ops / keeper team | Liquidation bot, oracle liveness monitoring |
| Compliance | KYC/AML deferred; no sanctions screening at MVP |
