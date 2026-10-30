// oxlint-disable
import { useState, useEffect, useCallback } from 'react'
import { parseAbiItem, decodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'
import { useArcNetwork } from './useArcNetwork'
import { getArcClient } from '../lib/arcClient'
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

// Max blocks per getLogs request Arc RPC allows
const LOG_CHUNK_SIZE = 4500n
// Scan back 30,000 blocks (~8 hours) from the latest block
const MAX_SCAN_DEPTH = 30000n

// Global cooldown: prevent multiple page mounts from hammering the RPC
let lastScanTime = 0
const SCAN_COOLDOWN_MS = 30_000 // 30 seconds between auto-scans

export function useUserDeals() {
  const { address, chainId, addresses, isMainnet } = useArcNetwork()

  // Use the standalone read-only Arc client — works regardless of connected wallet chain
  const client = getArcClient(isMainnet)

  const [deals, setDeals] = useState<LiveDeal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeals = useCallback(async (force = false) => {
    if (!addresses.registry) return

    // Enforce global cooldown to avoid Arc RPC rate limits
    const now = Date.now()
    if (!force && now - lastScanTime < SCAN_COOLDOWN_MS) return
    lastScanTime = now

    setIsLoading(true)
    setError(null)

    try {
      const stored = getStoredDeals(chainId)
      const storedMap = new Map<string, StoredDeal>()
      for (const s of stored) {
        storedMap.set(s.dealId.toLowerCase(), s)
      }

      // Get latest block from the standalone client (not wagmi)
      let latestBlock: bigint
      try {
        latestBlock = await client.getBlockNumber()
      } catch {
        latestBlock = 0n
      }

      // Deployment block is the absolute scan floor
      const deploymentBlock = 27635000n // Arc Mainnet deployment block
      const scanFloor = latestBlock > MAX_SCAN_DEPTH
        ? (latestBlock - MAX_SCAN_DEPTH > deploymentBlock ? latestBlock - MAX_SCAN_DEPTH : deploymentBlock)
        : deploymentBlock

      // Fetch DealProposed events scanning BACKWARDS from latestBlock
      let proposedLogs: any[] = []

      if (latestBlock > 0n) {
        let toBlock = latestBlock
        let chunksScanned = 0
        const MAX_CHUNKS = 8 // 8 × 4500 = 36,000 blocks (~10 hrs)

        while (toBlock > scanFloor && chunksScanned < MAX_CHUNKS) {
          const fromBlock = toBlock - LOG_CHUNK_SIZE + 1n < scanFloor
            ? scanFloor
            : toBlock - LOG_CHUNK_SIZE + 1n
          try {
            const logs = await client.getLogs({
              address: addresses.registry,
              event: parseAbiItem('event DealProposed(bytes16 indexed dealId, address indexed proposer, uint8 visibility)'),
              fromBlock,
              toBlock,
            })
            proposedLogs = proposedLogs.concat(logs)
          } catch (logErr: any) {
            const msg = logErr?.message?.toLowerCase() ?? ''
            const isRateLimit = msg.includes('limit') || msg.includes('rate') || msg.includes('too many')
            if (isRateLimit) {
              await new Promise((r) => setTimeout(r, 3000))
              break
            }
            console.warn(`getLogs chunk ${fromBlock}-${toBlock} failed:`, logErr)
          }
          toBlock = fromBlock - 1n
          chunksScanned++
          // 400ms between chunks to stay within rate limits
          await new Promise((r) => setTimeout(r, 400))
        }
      }

      // Collect all unique deal IDs from logs + localStorage
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

      // Fetch live deal structs from contract
      const dealList: LiveDeal[] = []

      await Promise.all(
        Array.from(dealIdSet).map(async (idLower) => {
          try {
            const raw = (await client.readContract({
              address: addresses.registry,
              abi: REGISTRY_ABI,
              functionName: 'getDeal',
              args: [idLower as `0x${string}`],
            })) as any

            // Skip zeroed-out / non-existent deals
            if (raw.borrower === '0x0000000000000000000000000000000000000000') return

            const storedInfo = storedMap.get(idLower)
            let salt = storedInfo?.salt

            // Recover salt for counterparty so they can claim seamlessly
            if (!salt && raw.visibility === 0 && raw.state === DealState.Proposed) {
              if (raw.reservedFor && raw.reservedFor !== '0x0000000000000000000000000000000000000000') {
                const candidate = deriveSaltForCounterparty(raw.dealId, raw.reservedFor)
                const expectedToken = keccak256(
                  encodeAbiParameters(parseAbiParameters('bytes16, bytes32'), [raw.dealId, candidate])
                )
                if (expectedToken.toLowerCase() === raw.claimToken.toLowerCase()) {
                  salt = candidate
                }
              }

              // Recover salt from original proposeDeal tx input
              if (!salt && txMap.has(idLower)) {
                try {
                  const tx = await client.getTransaction({ hash: txMap.get(idLower)! })
                  const decoded = decodeFunctionData({ abi: REGISTRY_ABI, data: tx.input })
                  if (decoded.functionName === 'proposeDeal' && decoded.args?.[8]) {
                    salt = decoded.args[8] as `0x${string}`
                  }
                } catch {
                  // Ignore recovery error
                }
              }

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

      dealList.sort((a, b) => {
        if (a.blockNumber && b.blockNumber) return Number(b.blockNumber - a.blockNumber)
        return b.dealId.localeCompare(a.dealId)
      })

      setDeals(dealList)
    } catch (err: any) {
      console.error('Error fetching on-chain deals:', err)
      setError(err?.message ?? 'Failed to load deals')
    } finally {
      setIsLoading(false)
    }
  }, [addresses.registry, chainId, isMainnet, address, client])

  useEffect(() => {
    void fetchDeals()
  }, [fetchDeals])

  const userLower = address ? address.toLowerCase() : ''

  const borrowedDeals = deals.filter((d) => d.borrower.toLowerCase() === userLower)
  const fundedDeals = deals.filter((d) => d.lender.toLowerCase() === userLower)
  const incomingDeals = deals.filter(
    (d) =>
      d.reservedFor.toLowerCase() === userLower &&
      d.state === DealState.Proposed &&
      d.borrower.toLowerCase() !== userLower
  )

  const userActiveBorrowed = borrowedDeals.filter(
    (d) => d.state === DealState.Active || d.state === DealState.Confirmed
  )
  const totalCollateralLocked = userActiveBorrowed.reduce((acc, d) => acc + d.collateral, 0n)
  const totalBorrowedUsdc = userActiveBorrowed.reduce((acc, d) => acc + d.principal, 0n)

  return {
    deals,
    borrowedDeals,
    fundedDeals,
    incomingDeals,
    totalCollateralLocked,
    totalBorrowedUsdc,
    isLoading,
    error,
    refetch: () => fetchDeals(true),
  }
}
