// oxlint-disable
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi'
import { Shield, AlertTriangle, Sparkles, Copy, ArrowRight, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, Button, Badge, Stat, TxStatus } from '../components/ui'
import {
  dealStateLabel,
  dealStateColor,
  formatUsdc,
  formatBtc,
  formatBps,
  computeRepayment,
  shortAddr,
  DealState,
  parseOnchainError,
  normalizeDealId,
  isValidDealId,
  deriveSaltForCounterparty,
} from '../lib/utils'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { getStoredDeals, saveStoredDeal } from '../lib/dealStorage'
import { DealChat } from '../components/DealChat'
import { keccak256, encodeAbiParameters, parseAbiParameters, decodeFunctionData } from 'viem'

export default function ClaimDeal() {
  const { token: dealIdParam } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const saltParam = searchParams.get('salt') as `0x${string}` | null

  const { address, isConnected, isWrongChain, chain, addresses, chainId } = useArcNetwork()
  const publicClient = usePublicClient({ chainId })

  const hasValidId = isValidDealId(dealIdParam)
  const normalizedDealId = normalizeDealId(dealIdParam)

  const { data: deal, isLoading, refetch, error: readError } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'getDeal',
    args: [normalizedDealId],
    chainId,
    query: {
      enabled: hasValidId,
      retry: false,
    },
  })

  // Recover salt if missing from URL params
  const [recoveredSalt, setRecoveredSalt] = useState<`0x${string}` | null>(null)

  useEffect(() => {
    if (saltParam || !deal) return

    // 1. Try localStorage
    const storedDeals = getStoredDeals(chainId)
    const stored = storedDeals.find((d) => d.dealId.toLowerCase() === normalizedDealId.toLowerCase())
    if (stored?.salt) {
      setRecoveredSalt(stored.salt)
      return
    }

    // 2. If private and reservedFor matches current user, try derived salt
    if (deal.visibility === 0 && deal.reservedFor && deal.reservedFor !== '0x0000000000000000000000000000000000000000') {
      const candidate = deriveSaltForCounterparty(normalizedDealId, deal.reservedFor)
      const expectedToken = keccak256(
        encodeAbiParameters(parseAbiParameters('bytes16, bytes32'), [normalizedDealId, candidate])
      )
      if (expectedToken.toLowerCase() === deal.claimToken.toLowerCase()) {
        setRecoveredSalt(candidate)
        return
      }
    }
  }, [saltParam, deal, normalizedDealId, chainId])

  // Public deals use empty salt (bytes32(0))
  const emptySalt = ('0x' + '00'.repeat(32)) as `0x${string}`
  const effectiveSalt: `0x${string}` | null =
    saltParam ||
    recoveredSalt ||
    (deal && deal.visibility === 1 ? emptySalt : null)

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const [receiptConfirmed, setReceiptConfirmed] = useState(false)

  const { isSuccess: isWagmiSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: {
      enabled: Boolean(hash),
    },
  })

  // Fast direct receipt polling
  useEffect(() => {
    if (!hash || receiptConfirmed || !publicClient) return
    let active = true
    const interval = setInterval(async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash })
        if (receipt && receipt.status === 'success' && active) {
          setReceiptConfirmed(true)
          clearInterval(interval)
          void refetch()
          toast.success('Deal sealed on-chain successfully!')
        }
      } catch {
        // Pending
      }
    }, 1000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [hash, receiptConfirmed, publicClient, refetch])

  const isSuccess = isWagmiSuccess || receiptConfirmed
  const isConfirming = Boolean(hash) && !isSuccess

  useEffect(() => {
    if (isSuccess) {
      void refetch()
      if (deal && address) {
        const borrowerSet = deal.borrower !== '0x0000000000000000000000000000000000000000'
        const role = borrowerSet ? 'lender' : 'borrower'
        saveStoredDeal({
          dealId: normalizedDealId,
          salt: effectiveSalt ?? undefined,
          role,
          principal: formatUsdc(deal.principal),
          collateral: formatBtc(deal.collateral),
          rateBps: (Number(deal.rateBps) / 100).toString(),
          durationMonths: deal.durationMonths,
          visibility: deal.visibility === 0 ? 'private' : 'public',
          chainId,
          createdAt: Date.now(),
        })
      }
    }
  }, [isSuccess, refetch, deal, address, normalizedDealId, effectiveSalt, chainId])

  if (!hasValidId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--danger)' }} />
        <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Invalid Deal ID
        </h2>
        <p className="text-sm" style={{ color: 'var(--subtle)' }}>
          The provided deal ID is not recognized. Please check the URL or ask the creator to resend.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <Card className="animate-pulse">
          <div className="h-6 rounded w-1/2 mb-4" style={{ background: 'var(--surface-muted)' }} />
          <div className="h-4 rounded w-3/4" style={{ background: 'var(--surface-muted)' }} />
        </Card>
      </div>
    )
  }

  if (!deal || readError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--danger)' }} />
        <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Deal Not Found
        </h2>
        <p className="text-sm" style={{ color: 'var(--subtle)' }}>
          No active deal was found for ID <code className="mono">{dealIdParam?.slice(0, 18)}...</code> on {chain?.name ?? 'Arc'}.
        </p>
      </div>
    )
  }

  // If deal is private and salt is completely missing
  if (deal.visibility === 0 && !effectiveSalt) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Lock size={40} className="mx-auto mb-4 text-[#ff8a00]" />
        <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Private Deal Claim Link Required
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--subtle)' }}>
          This is a private deal encrypted with a secret salt. Please ask the deal creator to send you their full invitation link containing the salt parameter.
        </p>
        <Link to="/dashboard">
          <Button variant="secondary" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const alreadyClaimed = deal.state !== DealState.Proposed
  const { interest, total } = computeRepayment(deal.principal, deal.rateBps, deal.durationMonths)

  // Determine roles
  const borrowerSet = deal.borrower !== '0x0000000000000000000000000000000000000000'
  const claimerRole = borrowerSet ? 'lender' : 'borrower'

  const isBorrower = Boolean(
    address &&
    deal.borrower !== '0x0000000000000000000000000000000000000000' &&
    address.toLowerCase() === deal.borrower.toLowerCase()
  )
  const isLender = Boolean(
    address &&
    deal.lender !== '0x0000000000000000000000000000000000000000' &&
    address.toLowerCase() === deal.lender.toLowerCase()
  )
  const isProposer = isBorrower || isLender

  const isReservedForOther =
    deal.reservedFor !== '0x0000000000000000000000000000000000000000' &&
    address?.toLowerCase() !== deal.reservedFor.toLowerCase()

  function claim() {
    if (!hasValidId || !effectiveSalt || !address) return
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'claimDeal',
      args: [normalizedDealId, effectiveSalt],
      chainId,
      gas: 200_000n,
    })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--brand-muted)' }}
        >
          <Shield size={20} style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Deal Invitation
          </h1>
          <p className="text-xs mono" style={{ color: 'var(--subtle)' }}>
            {(normalizedDealId).slice(0, 18)}...
          </p>
        </div>
        <Badge className={`ml-auto ${dealStateColor(deal.state)}`}>
          {dealStateLabel(deal.state)}
        </Badge>
      </div>

      {/* Creator Notice Banner */}
      {isProposer && (
        <Card className="mb-4 border border-[var(--brand)]/30 bg-[var(--brand-muted)]/20">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-sm" style={{ color: 'var(--brand)' }}>
            <Sparkles size={16} />
            You proposed this deal as {isBorrower ? 'Borrower' : 'Lender'}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
            {alreadyClaimed
              ? 'This deal has been sealed on-chain and terms are locked.'
              : `Share this invitation link with your counterparty (${claimerRole}) so they can connect their wallet and seal the deal.`}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={typeof window !== 'undefined' ? window.location.href : ''}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--ink)]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Invitation link copied!')
                }
              }}
              className="shrink-0"
            >
              <Copy size={13} className="mr-1 inline" /> Copy
            </Button>
          </div>
        </Card>
      )}

      {/* Human-Readable Agreement Terms Summary */}
      <Card className="mb-4 bg-[#120d0a] border border-[#ff8a00]/40">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-[#ff8a00]">
          📋 Agreement Terms Overview
        </p>
        <div className="text-xs text-[#ddc1ae] space-y-1.5">
          <p>
            • <strong>Borrower:</strong> <code className="text-[#ebe0d9]">{shortAddr(deal.borrower)}</code> is locking <strong className="text-[#ebe0d9]">{formatBtc(deal.collateral)} cirBTC</strong> as collateral.
          </p>
          <p>
            • <strong>Lender:</strong> Supplies <strong className="text-[#ebe0d9]">${formatUsdc(deal.principal)} USDC</strong> and earns <strong className="text-[#10b981]">{formatBps(deal.rateBps)} fixed APR</strong> over <strong className="text-[#ebe0d9]">{deal.durationMonths} months</strong>.
          </p>
          <p className="text-[#a58c7b]">
            • <strong>Security:</strong> Collateral is held non-custodially in smart contract escrow until loan repayment.
          </p>
        </div>
      </Card>

      {/* Terms Stats */}
      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--subtle)' }}>
          Loan Stats
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Stat label="Principal" value={`$${formatUsdc(deal.principal)}`} />
          <Stat label="Annual Rate" value={formatBps(deal.rateBps)} />
          <Stat label="Duration" value={`${deal.durationMonths} months`} />
          <Stat label="Collateral" value={`${formatBtc(deal.collateral)} BTC`} />
        </div>
        <div
          className="rounded-xl p-3 mt-2"
          style={{ background: 'var(--surface-muted)' }}
        >
          <div className="flex justify-between text-sm mb-1">
            <span style={{ color: 'var(--subtle)' }}>Total repayment</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              ${formatUsdc(total)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--subtle)' }}>Interest</span>
            <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
              ${formatUsdc(interest)}
            </span>
          </div>
        </div>
      </Card>

      {/* Parties */}
      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
          Parties
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--subtle)' }}>Borrower</span>
            <code className="mono text-xs" style={{ color: 'var(--ink)' }}>
              {deal.borrower === '0x0000000000000000000000000000000000000000'
                ? '(to be filled on claim)'
                : shortAddr(deal.borrower)}
            </code>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--subtle)' }}>Lender</span>
            <code className="mono text-xs" style={{ color: 'var(--ink)' }}>
              {deal.lender === '0x0000000000000000000000000000000000000000'
                ? '(to be filled on claim)'
                : shortAddr(deal.lender)}
            </code>
          </div>
          {deal.reservedFor !== '0x0000000000000000000000000000000000000000' && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--subtle)' }}>Reserved for</span>
              <code className="mono text-xs text-[#ff8a00]">
                {shortAddr(deal.reservedFor)}
              </code>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--subtle)' }}>Connected wallet</span>
            <code className="mono text-xs" style={{ color: 'var(--ink)' }}>
              {address ? shortAddr(address) : 'Not connected'}
            </code>
          </div>
        </div>
      </Card>

      {/* CTA Section */}
      {!isConnected ? (
        <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
          Connect your wallet to participate in this deal
        </div>
      ) : isWrongChain ? (
        <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
          Switch your wallet to Arc Mainnet (5042) or Arc Testnet (5042002)
        </div>
      ) : isProposer ? (
        alreadyClaimed ? (
          <Link to={`/deal/manage/${normalizedDealId}`}>
            <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
              <span>Manage Loan & Escrow</span>
              <ArrowRight size={16} />
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="w-full opacity-80 cursor-default"
            disabled
          >
            Awaiting Counterparty ({claimerRole}) Acceptance...
          </Button>
        )
      ) : isReservedForOther ? (
        <div className="rounded-xl p-3 text-sm text-center bg-red-950/40 border border-red-500/40 text-red-300">
          ⚠️ This deal is reserved for address {shortAddr(deal.reservedFor)}. Please switch to that wallet to seal this deal.
        </div>
      ) : alreadyClaimed ? (
        <Link to={`/deal/manage/${normalizedDealId}`}>
          <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
            <span>View Active Loan & Escrow</span>
            <ArrowRight size={16} />
          </Button>
        </Link>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending || isConfirming || isSuccess}
          onClick={claim}
        >
          {isPending
            ? 'Confirm in wallet...'
            : isConfirming
            ? 'Confirming on Arc Testnet...'
            : isSuccess
            ? 'Deal Confirmed!'
            : `Accept & Seal Deal as ${claimerRole}`}
        </Button>
      )}

      <TxStatus
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        error={error ? parseOnchainError(error) : null}
        explorerUrl={hash ? `${chain.explorerBase}/tx/${hash}` : undefined}
      />

      {isSuccess && (
        <Card className="mt-4 border border-[var(--success)]/40 bg-[var(--surface-muted)]">
          <div className="flex items-center gap-2 mb-1 text-[var(--success)] font-semibold text-sm">
            <CheckCircle2 size={16} />
            <span>Deal successfully sealed on-chain!</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
            Both parties are now registered on-chain. Terms are permanently locked in the Persat Escrow Vault.
          </p>
          <Link to={`/deal/manage/${normalizedDealId}`}>
            <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5">
              <span>Proceed to Deal Management & Escrow</span>
              <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>
      )}

      {/* P2P Live Deal Chat & Negotiation Box */}
      <DealChat
        dealId={normalizedDealId}
        borrower={deal.borrower}
        lender={deal.lender}
        currentAddress={address}
        dealStateLabel={dealStateLabel(deal.state)}
      />
    </div>
  )
}
