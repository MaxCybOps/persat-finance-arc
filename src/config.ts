/**
 * wagmi + ConnectKit configuration for Persat Finance
 *
 * IMPORTANT: Arc Testnet has no Multicall3 contract at the canonical address.
 * multicall is disabled globally to prevent 10-second RPC timeouts on every read.
 */

import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'

/** Arc Mainnet (Chain ID 5042) — no Multicall3 */
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
  contracts: {}, // no multicall3
})

/** Arc Testnet (Chain ID 5042002) — no Multicall3 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.testnet.arc.io' },
  },
  testnet: true,
  contracts: {}, // no multicall3
})

registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

// Always use the real production URL — never localhost (causes MetaMask security warning)
const APP_URL = 'https://persat-finance-arc-mwuz.vercel.app'

const connectors = [
  injected({ shimDisconnect: true }),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          showQrModal: false, // ConnectKit handles its own modal — prevent double QR popup
          metadata: {
            name: 'Persat Finance',
            description: 'Trust-minimized BTC-collateralised lending on Arc',
            url: APP_URL,
            icons: [`${APP_URL}/persatlogo.png`],
          },
        }),
      ]
    : []),
]

export const config = createConfig({
  chains: [arcMainnet],
  connectors,
  transports: {
    [arcMainnet.id]: http('https://rpc.mainnet.arc.io', { timeout: 30_000, retryCount: 3 }),
  },
  batch: {
    multicall: false, // Arc has no Multicall3 — disabling prevents 10s timeouts
  },
})
