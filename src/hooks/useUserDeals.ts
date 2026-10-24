import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { useArcNetwork } from './useArcNetwork'
import { REGISTRY_ABI } from '../contracts/abis'
import { getStoredDeals, StoredDeal } from '../lib/dealStorage'
import { normalizeDealId, DealState } from '../lib/utils'

export interface LiveDeal {
  dealId: `0x${string}`
  borrower: `0x${string}`
  lender: `0x${string}`
  principal: bigint
  collateral: bigint
  rateBps: bigint
  durationMonths: number
  visibility: number
  state: number
  termsHash: `0x${string}`
  claimToken: `0x${string}`
  reservedFor: `0x${string}`
  activatedAt: bigint
  blockNumber?: bigint
  salt?: `0x${string}`
}

export function useUserDeals() {
  const { address, chainId, addresses, isMainnet } = useArcNetwork()
  const publicClient = usePublicClient({ chainId })

  const [deals, setDeals] = useState<LiveDeal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeals = useCallback(async () => {
    if (!publicClient || !addresses.registry) return

    setIsLoading(true)
    setError(null)

    try {
      const stored = getStoredDeals(chainId)
      const storedMap = new Map<string, StoredDeal>()
      for (const s of stored) {
        storedMap.set(s.dealId.toLowerCase(), s)
      }

      // Deployment start blocks for fast log scanning
      const fromBlock = isMainnet ? 27635000n : 68860000n

      // 1. Fetch DealProposed events from the registry
      let proposedLogs: any[] = []
      try {
        proposedLogs = await publicClient.getLogs({
          address: addresses.registry,
          event: parseAbiItem('event DealProposed(bytes16 indexed dealId, address indexed proposer, uint8 visibility)'),
          fromBlock,
        })
      } catch (logErr) {
        console.warn('Could not query getLogs for DealProposed:', logErr)
      }

      // Collect all unique deal IDs from logs and localStorage
      const dealIdSet = new Set<string>()
      const blockMap = new Map<string, bigint>()

      for (const log of proposedLogs) {
        if (log.args?.dealId) {
          const id = normalizeDealId(log.args.dealId).toLowerCase()
          dealIdSet.add(id)
          if (log.blockNumber) blockMap.set(id, log.blockNumber)
        }
      }

      for (const s of stored) {
        dealIdSet.add(normalizeDealId(s.dealId).toLowerCase())
      }

      // 2. Fetch live deal structs from smart contract
      const dealList: LiveDeal[] = []

      await Promise.all(
        Array.from(dealIdSet).map(async (idLower) => {
          try {
            const raw = (await publicClient.readContract({
              address: addresses.registry,
              abi: REGISTRY_ABI,
              functionName: 'getDeal',
              args: [idLower as `0x${string}`],
            })) as any

            const storedInfo = storedMap.get(idLower)

            dealList.push({
              dealId: raw.dealId,
              borrower: raw.borrower,
              lender: raw.lender,
              principal: raw.principal,
              collateral: raw.collateral,
              rateBps: raw.rateBps,
              durationMonths: raw.durationMonths,
              visibility: raw.visibility,
              state: raw.state,
              termsHash: raw.termsHash,
              claimToken: raw.claimToken,
              reservedFor: raw.reservedFor,
              activatedAt: raw.activatedAt,
              blockNumber: blockMap.get(idLower),
              salt: storedInfo?.salt,
            })
          } catch {
            // Deal does not exist on this chain
          }
        })
      )

      // Sort by newest first (descending blockNumber or dealId)
      dealList.sort((a, b) => {
        if (a.blockNumber && b.blockNumber) {
          return Number(b.blockNumber - a.blockNumber)
        }
        return b.dealId.localeCompare(a.dealId)
      })

      setDeals(dealList)
    } catch (err: any) {
      console.error('Error fetching on-chain user deals:', err)
      setError(err?.message ?? 'Failed to load deals')
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, addresses.registry, chainId, isMainnet])

  useEffect(() => {
    void fetchDeals()
  }, [fetchDeals])

  const userLower = address ? address.toLowerCase() : ''

  // Categorize
  const borrowedDeals = deals.filter(
    (d) => d.borrower.toLowerCase() === userLower
  )

  const fundedDeals = deals.filter(
    (d) => d.lender.toLowerCase() === userLower
  )

  const incomingDeals = deals.filter(
    (d) =>
      d.reservedFor.toLowerCase() === userLower &&
      d.state === DealState.Proposed &&
      d.borrower.toLowerCase() !== userLower
  )

  // Portfolio metrics across user's active/confirmed deals
  const userActiveBorrowed = borrowedDeals.filter(
    (d) => d.state === DealState.Active || d.state === DealState.Confirmed
  )

  const totalCollateralLocked = userActiveBorrowed.reduce(
    (acc, d) => acc + d.collateral,
    0n
  )

  const totalBorrowedUsdc = userActiveBorrowed.reduce(
    (acc, d) => acc + d.principal,
    0n
  )

  return {
    deals,
    borrowedDeals,
    fundedDeals,
    incomingDeals,
    totalCollateralLocked,
    totalBorrowedUsdc,
    isLoading,
    error,
    refetch: fetchDeals,
  }
}
