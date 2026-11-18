# Persat Finance — Agent Memory

## Deployed Contracts (Arc Testnet, Chain ID 5042002)

| Contract | Address | Explorer |
|----------|---------|---------|
| PersatDealRegistry | `0x2ed7e6d7f293299a4f9083b4c49d6d0b53171e70` | https://explorer.testnet.arc.io/address/0x2ed7e6d7f293299a4f9083b4c49d6d0b53171e70 |
| PersatEscrowVault | `0x59241023610c71c56154e5c6d56821a750ff2e76` | https://explorer.testnet.arc.io/address/0x59241023610c71c56154e5c6d56821a750ff2e76 |
| MockPriceFeed (testnet oracle) | `0xa620864091aa03188e33db8ef938dc7e82e4a463` | https://explorer.testnet.arc.io/address/0xa620864091aa03188e33db8ef938dc7e82e4a463 |
| MockERC20 cirBTC (testnet) | `0x52c0757272713869f2a34827386c301a5c3af744` | https://explorer.testnet.arc.io/address/0x52c0757272713869f2a34827386c301a5c3af744 |

### Token Addresses

| Token | Address | Decimals |
|-------|---------|---------|
| USDC (Arc Testnet ERC-20) | `0x3600000000000000000000000000000000000000` | 6 |
| cirBTC (testnet mock) | `0x52c0757272713869f2a34827386c301a5c3af744` | 8 |

### Deploy Owner / Fee Recipient

Owner wallet (your MetaMask): `0x96cb116869808e935b870E94517f6F58CDED5cDE`
Previous deployer (old contracts, no longer used): `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`

---

## IMPORTANT: Security review (Nov 2026)

The contracts in `contracts/` were changed after a security review (see `contracts/PersatFinance-design.md` →
*Security review — November 2026*). The addresses listed above run the **old** code and must be redeployed.
The current Arc Mainnet deployment uses a publicly mintable mock "cirBTC" and must not hold real funds.
`PersatEscrowVault` constructor now takes `maxInitialLtvBps` (after `liquidationThresholdBps`).

Audit round 2 + bridge analysis (branch `fix/audit-round2-bridge`, see the design doc):
- `PersatDealRegistry` constructor is now `(usdc, cirBtc, initialOwner)` (unused fee settings removed).
- `PersatEscrowVault` constructor takes `pegGuard` after `maxInitialLtvBps` (`CirBtcPoolTwap` on mainnet, `address(0)` to disable).
- Payouts fall back to `claimable[token][account]` + `withdraw(token)` when a transfer fails (Circle freeze/pause).
- Liquidators repay the lender in USDC; interest is pro rata (1-month minimum); fee changes wait 4 days.
- Deals are listed on-chain (`getUserDeals`, `getPublicDeals`); the frontend no longer scans event logs.
- `src/contracts/addresses.mainnet.json` is the frontend's source of mainnet addresses and is rewritten by `scripts/deploy-mainnet.cjs`. Ship the frontend only together with the redeployed contracts.
- Mainnet deploy: `CIRBTC_ADDRESS=0x171A4217b86A807A64eB94757Db6849fb4bDbAA0 OWNER_ADDRESS=<Safe> node scripts/deploy-mainnet.cjs` (run with `DRY_RUN=1` first). The Safe must then call `acceptOwnership()` on both contracts.

## IMPORTANT: Wiring Step Required

The Registry's `setVault(address)` function must be called ONCE to wire the vault into the registry.
Owner: `0x96cb116869808e935b870E94517f6F58CDED5cDE` (your MetaMask wallet — connect on Arc Testnet and call from the frontend or explorer).
Call: `PersatDealRegistry.setVault(0x59241023610c71c56154e5c6d56821a750ff2e76)`

---

## Mainnet Deploy Notes

For Arc Mainnet, redeploy with:
- cirBTC: real cirBTC ERC-20 address on Arc mainnet
- priceFeed: Chainlink BTC/USD proxy `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De` (8 decimals, 86400s heartbeat)
- stalenessThreshold: 93600 (26 hours: 24 h heartbeat + 2 h margin)
- MockPriceFeed and MockERC20 are NOT used on mainnet

---

## Source Files

| File | Path |
|------|------|
| PersatDealRegistry | `contracts/PersatDealRegistry.sol` |
| PersatEscrowVault | `contracts/PersatEscrowVault.sol` |
| IPriceFeed interface | inline in `contracts/PersatEscrowVault.sol` |
| PythPriceFeedAdapter | `contracts/PythPriceFeedAdapter.sol` |
| Design doc | `contracts/PersatFinance-design.md` |
| CirBtcPoolTwap (peg guard) | `contracts/CirBtcPoolTwap.sol` |
| Unit tests | `contracts/test/PersatDealRegistry.t.sol`, `contracts/test/PersatEscrowVault.t.sol`, `contracts/test/SecurityFixes.t.sol`, `contracts/test/AuditRound2.t.sol` |
| Test helpers | `contracts/test-helpers/MockERC20.sol`, `contracts/test-helpers/MockPriceFeed.sol`, `contracts/test-helpers/MockFiatToken.sol`, `contracts/test-helpers/MockUniswapV3Pool.sol` |

---

## Frontend

Built with React 18, Vite, TypeScript, Tailwind CSS (Arc Dark tokens), Wagmi v2, ConnectKit, React Router v7.

| Screen | Route | File |
|---|---|---|
| Dashboard | `/` | `src/pages/Dashboard.tsx` |
| New Deal | `/deal/new` | `src/pages/NewDeal.tsx` |
| Claim | `/deal/claim/:token` | `src/pages/ClaimDeal.tsx` |
| Marketplace | `/marketplace` | `src/pages/Marketplace.tsx` |
| Manage | `/deal/:id/manage` | `src/pages/ManageDeal.tsx` |

Contract addresses: `src/contracts/addresses.ts` (env-var overridable)
Contract ABIs: `src/contracts/abis.ts`
Shared utilities: `src/lib/utils.ts`

Vercel deploy instructions: `VERCEL_DEPLOY.md`
SPA routing rewrite: `vercel.json`

---

## Oracle Notes

- Arc Testnet: No Chainlink Data Feeds. Pyth is available at `0x2880aB155794e7179c9eE2e38200202908C17B43` but uses a different interface (not AggregatorV3). A Pyth adapter wrapping `getPriceUnsafe` to expose `latestRoundData` + `decimals()` is required for a production testnet oracle.
- Arc Mainnet: Chainlink BTC/USD proxy at `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De`, 8 decimals, 86400s heartbeat.
