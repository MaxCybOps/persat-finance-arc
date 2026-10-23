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

## IMPORTANT: Wiring Step Required

The Registry's `setVault(address)` function must be called ONCE to wire the vault into the registry.
Owner: `0x96cb116869808e935b870E94517f6F58CDED5cDE` (your MetaMask wallet — connect on Arc Testnet and call from the frontend or explorer).
Call: `PersatDealRegistry.setVault(0x59241023610c71c56154e5c6d56821a750ff2e76)`

---

## Mainnet Deploy Notes

For Arc Mainnet, redeploy with:
- cirBTC: real cirBTC ERC-20 address on Arc mainnet
- priceFeed: Chainlink BTC/USD proxy `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De` (8 decimals, 86400s heartbeat)
- stalenessThreshold: 86400 (24 hours)
- MockPriceFeed and MockERC20 are NOT used on mainnet

---

## Source Files

| File | Path |
|------|------|
| PersatDealRegistry | `contracts/PersatDealRegistry.sol` |
| PersatEscrowVault | `contracts/PersatEscrowVault.sol` |
| IPriceFeed interface | inline in `contracts/PersatEscrowVault.sol` |
| Design doc | `contracts/PersatFinance-design.md` |
| Unit tests | `contracts/test/PersatDealRegistry.t.sol`, `contracts/test/PersatEscrowVault.t.sol` |
| Test helpers | `contracts/test-helpers/MockERC20.sol`, `contracts/test-helpers/MockPriceFeed.sol` |

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
