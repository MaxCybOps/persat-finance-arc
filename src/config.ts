/**
 * wagmi + ConnectKit configuration for Persat Finance
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arc.id, arc.rpcUrls.default.http[0])

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

const appOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5173'
const appIcon = `${appOrigin}/logo.svg`

const connectors = [
  injected(),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          metadata: {
            name: 'Persat Finance',
            description: 'Trust-minimized BTC-collateralised lending on Arc',
            url: appOrigin,
            icons: [appIcon],
          },
        }),
      ]
    : []),
]

export const config = createConfig({
  chains: [arc, arcTestnet],
  connectors,
  transports: {
    [arc.id]: http(),
    [arcTestnet.id]: http(),
  },
})
