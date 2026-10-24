# Persat Finance

Trust-minimized peer-to-peer Bitcoin-collateralised lending on Arc Testnet. Borrowers lock cirBTC as collateral and borrow USDC at fixed terms. Every deal state transition is governed by math and on-chain events — no operator keys, no god-mode.

Built with [Arc Studio](https://studio.arc.io)

---

## Tech stack

- **Smart contracts:** Solidity 0.8.24, OpenZeppelin 5.1.0, Foundry — deployed to Arc Testnet (chain ID 5042002)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Wagmi v2, Viem, ConnectKit, React Router v7
- **Chain:** Arc Testnet — USDC is the native gas token

---

## Deployed contracts

### Arc Mainnet (Chain ID 5042)

| Contract | Address | Explorer |
|---|---|---|
| PersatDealRegistry | `0x46725a32b46f5388be1237e2847694fdecab3b3c` | [View on Explorer](https://explorer.arc.io/address/0x46725a32b46f5388be1237e2847694fdecab3b3c) |
| PersatEscrowVault | `0x48396168c79fce1c4b002c1f8f660b0f73dd43f6` | [View on Explorer](https://explorer.arc.io/address/0x48396168c79fce1c4b002c1f8f660b0f73dd43f6) |
| cirBTC Collateral | `0x9b6ef2eb94fc756d2521ddc42baeb4ec3a3454c4` | [View on Explorer](https://explorer.arc.io/address/0x9b6ef2eb94fc756d2521ddc42baeb4ec3a3454c4) |
| Chainlink BTC/USD Oracle | `0xa109B535C70C8Be9995be64Bb6751AcDB27e03De` | [View on Explorer](https://explorer.arc.io/address/0xa109B535C70C8Be9995be64Bb6751AcDB27e03De) |
| Native USDC Gas & ERC-20 | `0x3600000000000000000000000000000000000000` | [View on Explorer](https://explorer.arc.io/address/0x3600000000000000000000000000000000000000) |

- **Live Arc Mainnet Proof Transaction:** [`0xd029dbc35c6a8881eafcdcbe26ef487a8ed1c72b6d1d65514133b4688c6caa8f`](https://explorer.arc.io/tx/0xd029dbc35c6a8881eafcdcbe26ef487a8ed1c72b6d1d65514133b4688c6caa8f)

### Arc Testnet (Chain ID 5042002)

| Contract | Address |
|---|---|
| PersatDealRegistry | `0x2ed7e6d7f293299a4f9083b4c49d6d0b53171e70` |
| PersatEscrowVault | `0x59241023610c71c56154e5c6d56821a750ff2e76` |
| MockPriceFeed (BTC/USD $60k) | `0xa620864091aa03188e33db8ef938dc7e82e4a463` |
| MockERC20 (cirBTC testnet) | `0x52c0757272713869f2a34827386c301a5c3af744` |
| USDC (Arc Testnet) | `0x3600000000000000000000000000000000000000` |

Explorer: `https://explorer.testnet.arc.io`

---

## Development

### Prerequisites

- Node.js 18+ and [Bun](https://bun.sh)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for contract work

### Install

```bash
bun install
```

### Environment variables

Create a `.env` file in the project root with the following variables:

| Variable | Purpose |
|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID (get free at cloud.walletconnect.com) |
| `VITE_REGISTRY_ADDRESS` | PersatDealRegistry contract address (defaults to Arc Testnet deploy) |
| `VITE_VAULT_ADDRESS` | PersatEscrowVault contract address (defaults to Arc Testnet deploy) |
| `VITE_CIRBTC_ADDRESS` | cirBTC ERC-20 address (defaults to Arc Testnet mock) |
| `VITE_PRICE_FEED_ADDRESS` | IPriceFeed oracle address (defaults to Arc Testnet mock) |

All `VITE_*_ADDRESS` variables have hardcoded defaults pointing to the Arc Testnet deploys, so the app works without any env configuration for testnet testing. Only `VITE_WALLETCONNECT_PROJECT_ID` is required for WalletConnect (MetaMask injected works without it).

### Run

```bash
bun run dev
```

Open `http://localhost:5173`

### Build

```bash
bun run build
```

### Test contracts

```bash
bun run contracts:test          # all 107 unit + fuzz tests
bun run contracts:build         # compile only
```

### Lint and typecheck

```bash
bun run check
```

---

## Deploy to Vercel

See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for step-by-step instructions including Arc Testnet RPC configuration, environment variables, and wallet setup.

---

## Screens

| Route | Description |
|---|---|
| `/` | Dashboard — protocol overview, your deals |
| `/deal/new` | Create a private-link or open-marketplace deal |
| `/deal/claim/:token?salt=...` | Claim a private deal link |
| `/marketplace` | Browse open lending/borrowing orders, submit counter-offers |
| `/deal/:id/manage` | Manage a specific deal — approve, activate, repay, liquidate |

---

## One-time wiring

The owner of PersatDealRegistry must call `setVault(0x79a374...)` once to connect the vault.  
Owner is `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (platform deployer wallet).  
Use the Contracts panel ABI tool or a self-deploy wallet to execute this call.
