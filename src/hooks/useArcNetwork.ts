import { useAccount } from 'wagmi'
import {
  ARC_MAINNET_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID,
  SUPPORTED_CHAIN_IDS,
  getAddresses,
} from '../contracts/addresses'
import { requireChain } from '@/onchain-facts'

export function useArcNetwork() {
  const { chainId, isConnected, address } = useAccount()

  const isMainnet = chainId === ARC_MAINNET_CHAIN_ID
  const isSupported = Boolean(chainId && (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId))
  const activeChainId = isMainnet ? ARC_MAINNET_CHAIN_ID : ARC_TESTNET_CHAIN_ID
  const chain = requireChain(activeChainId)
  const addresses = getAddresses(activeChainId)

  return {
    chainId: activeChainId,
    connectedChainId: chainId,
    isMainnet,
    isSupported,
    isWrongChain: Boolean(isConnected && chainId && !isSupported),
    chain,
    addresses,
    address,
    isConnected,
  }
}
