// oxlint-disable
import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem, decodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'
import { useArcNetwork } from './useArcNetwork'
import { REGISTRY_ABI } from '../contracts/abis'
import { getStoredDeals, saveStoredDeal, StoredDeal } from '../lib/dealStorage'
import { normalizeDealId, DealState, deriveSaltForCounterparty } from '../lib/utils'

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

// Max blocks the Arc RPC allows per getLogs call
const LOG_CHUNK_SIZE = 4500n
// Scan last ~24 hours (86400 blocks at ~1/sec); deployment block is the floor
const MAX_SCAN_DEPTH = 90000n

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

      // ─── Dynamic block range: fetch latest block and scan in chunks ───
      let latestBlock: bigint
      try {
        latestBlock = await publicClient.getBlockNumber()
      } catch {
        latestBlock = 0n
      }

      // Absolute minimum from deployment
      const deploymentBlock = isMainnet ? 27635000n : 68660000n
      const scanStart = latestBlock > MAX_SCAN_DEPTH
        ? (latestBlock - MAX_SCAN_DEPTH > deploymentBlock ? latestBlock - MAX_SCAN_DEPTH : deploymentBlock)
        : deploymentBlock

      // 1. Fetch DealProposed events scanning BACKWARDS from latestBlock (newest first)
      let proposedLogs: any[] = []

      if (latestBlock > 0n) {
        let toBlock = latestBlock
        const minBlock = scanStart
        let chunksScanned = 0
        const MAX_CHUNKS = 20 // 20 × 4500 = 90,000 blocks (~25 hrs), rate-limit safe

        while (toBlock > minBlock && chunksScanned < MAX_CHUNKS) {
          const fromBlock = toBlock - LOG_CHUNK_SIZE + 1n < minBlock
            ? minBlock
            : toBlock - LOG_CHUNK_SIZE + 1n
          try {
            const logs = await publicClient.getLogs({
              address: addresses.registry,
              event: parseAbiItem('event DealProposed(bytes16 indexed dealId, address indexed proposer, uint8 visibility)'),
              fromBlock,
              toBlock,
            })
            proposedLogs = proposedLogs.concat(logs)
          } catch (logErr: any) {
            const isRateLimit = logErr?.message?.toLowerCase().includes('limit') || logErr?.message?.toLowerCase().includes('rate')
            if (isRateLimit) {
              // Back off and stop scanning to avoid hammering the RPC
              await new Promise((r) => setTimeout(r, 2000))
              break
            }
            console.warn(`getLogs chunk ${fromBlock}-${toBlock} failed:`, logErr)
          }
          toBlock = fromBlock - 1n
          chunksScanned++
          // 300ms between chunks — stays well within Arc RPC rate limits
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      // Collect all unique deal IDs from logs and localStorage
      const dealIdSet = new Set<string>()
      const blockMap = new Map<string, bigint>()
      const txMap = new Map<string, `0x${string}`>()

      for (const log of proposedLogs) {
        if (log.args?.dealId) {
          const id = normalizeDealId(log.args.dealId).toLowerCase()
          dealIdSet.add(id)
          if (log.blockNumber) blockMap.set(id, log.blockNumber)
          if (log.transactionHash) txMap.set(id, log.transactionHash)
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

            // Skip zeroed-out / non-existent deals
            if (raw.borrower === '0x0000000000000000000000000000000000000000') return

            const storedInfo = storedMap.get(idLower)
            let salt = storedInfo?.salt

            // If private deal and salt is missing, recover it so counterparty can claim seamlessly
            if (!salt && raw.visibility === 0 && raw.state === DealState.Proposed) {
              // 1. Check deterministic derived salt if reservedFor is set
              if (raw.reservedFor && raw.reservedFor !== '0x0000000000000000000000000000000000000000') {
                const candidate = deriveSaltForCounterparty(raw.dealId, raw.reservedFor)
                const expectedToken = keccak256(
                  encodeAbiParameters(parseAbiParameters('bytes16, bytes32'), [raw.dealId, candidate])
                )
                if (expectedToken.toLowerCase() === raw.claimToken.toLowerCase()) {
                  salt = candidate
                }
              }

              // 2. If still not found, recover salt directly from the proposing transaction input
              if (!salt && txMap.has(idLower)) {
                try {
                  const tx = await publicClient.getTransaction({ hash: txMap.get(idLower)! })
                  const decoded = decodeFunctionData({ abi: REGISTRY_ABI, data: tx.input })
                  if (decoded.functionName === 'proposeDeal' && decoded.args?.[8]) {
                    salt = decoded.args[8]
                  }
                } catch {
                  // Ignore recovery error
                }
              }

              // Cache recovered salt into local storage so it persists
              if (salt) {
                saveStoredDeal({
                  dealId: raw.dealId,
                  salt,
                  role: address && raw.borrower.toLowerCase() === address.toLowerCase() ? 'borrower' : 'lender',
                  principal: (Number(raw.principal) / 1e6).toString(),
                  collateral: (Number(raw.collateral) / 1e8).toString(),
                  rateBps: (Number(raw.rateBps) / 100).toString(),
                  durationMonths: raw.durationMonths,
                  visibility: 'private',
                  reservedFor: raw.reservedFor,
                  chainId,
                  createdAt: Date.now(),
                })
              }
            }

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
              salt,
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
  }, [publicClient, addresses.registry, chainId, isMainnet, address])

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
