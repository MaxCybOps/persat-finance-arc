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

/** Arc Testnet chain ID */
export const ARC_TESTNET_CHAIN_ID = 5042002
