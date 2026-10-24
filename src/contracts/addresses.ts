/**
 * Persat Finance — deployed contract addresses (Arc Testnet)
 * All addresses are injected via VITE_ env vars so they can be
 * overridden per-environment without a code change.
 */

export const REGISTRY_ADDRESS = (
  import.meta.env.VITE_REGISTRY_ADDRESS ?? '0x2ed7e6d7f293299a4f9083b4c49d6d0b53171e70'
) as `0x${string}`

export const VAULT_ADDRESS = (
  import.meta.env.VITE_VAULT_ADDRESS ?? '0x59241023610c71c56154e5c6d56821a750ff2e76'
) as `0x${string}`

export const ESCROW_VAULT_ADDRESS = VAULT_ADDRESS

export const CIRBTC_ADDRESS = (
  import.meta.env.VITE_CIRBTC_ADDRESS ?? '0x52c0757272713869f2a34827386c301a5c3af744'
) as `0x${string}`

export const PRICE_FEED_ADDRESS = (
  import.meta.env.VITE_PRICE_FEED_ADDRESS ?? '0xa620864091aa03188e33db8ef938dc7e82e4a463'
) as `0x${string}`

export const ARC_MAINNET_CHAIN_ID = 5042
export const ARC_TESTNET_CHAIN_ID = 5042002

export const SUPPORTED_CHAIN_IDS = [ARC_MAINNET_CHAIN_ID, ARC_TESTNET_CHAIN_ID] as const

/** Chainlink BTC/USD Oracle on Arc Mainnet */
export const ARC_MAINNET_CHAINLINK_FEED = '0xa109B535C70C8Be9995be64Bb6751AcDB27e03De' as `0x${string}`

/** Native USDC ERC-20 on Arc */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`

/** Arc Mainnet Deployed Addresses (Chain ID 5042) */
export const MAINNET_REGISTRY_ADDRESS = '0x46725a32b46f5388be1237e2847694fdecab3b3c' as `0x${string}`
export const MAINNET_VAULT_ADDRESS = '0x48396168c79fce1c4b002c1f8f660b0f73dd43f6' as `0x${string}`
export const MAINNET_CIRBTC_ADDRESS = '0x9b6ef2eb94fc756d2521ddc42baeb4ec3a3454c4' as `0x${string}`

export function getAddresses(chainId?: number) {
  const isMainnet = chainId === ARC_MAINNET_CHAIN_ID

  return {
    registry: (
      (isMainnet ? import.meta.env.VITE_MAINNET_REGISTRY_ADDRESS : import.meta.env.VITE_REGISTRY_ADDRESS) ??
      (isMainnet ? MAINNET_REGISTRY_ADDRESS : '0x2ed7e6d7f293299a4f9083b4c49d6d0b53171e70')
    ) as `0x${string}`,
    vault: (
      (isMainnet ? import.meta.env.VITE_MAINNET_VAULT_ADDRESS : import.meta.env.VITE_VAULT_ADDRESS) ??
      (isMainnet ? MAINNET_VAULT_ADDRESS : '0x59241023610c71c56154e5c6d56821a750ff2e76')
    ) as `0x${string}`,
    cirBtc: (
      (isMainnet ? import.meta.env.VITE_MAINNET_CIRBTC_ADDRESS : import.meta.env.VITE_CIRBTC_ADDRESS) ??
      (isMainnet ? MAINNET_CIRBTC_ADDRESS : '0x52c0757272713869f2a34827386c301a5c3af744')
    ) as `0x${string}`,
    priceFeed: (
      isMainnet
        ? (import.meta.env.VITE_MAINNET_PRICE_FEED_ADDRESS ?? ARC_MAINNET_CHAINLINK_FEED)
        : (import.meta.env.VITE_PRICE_FEED_ADDRESS ?? '0xa620864091aa03188e33db8ef938dc7e82e4a463')
    ) as `0x${string}`,
    usdc: ARC_USDC_ADDRESS,
  }
}
