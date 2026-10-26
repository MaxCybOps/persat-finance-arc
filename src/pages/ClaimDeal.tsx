import { useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { Shield, AlertTriangle, Sparkles, Copy, ArrowRight } from 'lucide-react'
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
} from '../lib/utils'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { saveStoredDeal } from '../lib/dealStorage'
import { DealChat } from '../components/DealChat'

export default function ClaimDeal() {
  const { token: dealIdParam } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const salt = searchParams.get('salt') as `0x${string}` | null

  const { address, isConnected, isWrongChain, chain, addresses, chainId } = useArcNetwork()

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

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: {
      enabled: Boolean(hash),
    },
  })

  useEffect(() => {
    if (isSuccess) {
      void refetch()
      if (deal && address) {
        const borrowerSet = deal.borrower !== '0x0000000000000000000000000000000000000000'
        const role = borrowerSet ? 'lender' : 'borrower'
        saveStoredDeal({
          dealId: normalizedDealId,
          salt: salt ?? undefined,
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
  }, [isSuccess, refetch, deal, address, normalizedDealId, salt, chainId])

  if (!dealIdParam || !salt) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--danger)' }} />
        <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Invalid claim link
        </h2>
        <p className="text-sm" style={{ color: 'var(--subtle)' }}>
          This link is missing required parameters. Ask the deal creator to resend it.
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
          Deal not found
        </h2>
        <p className="text-sm" style={{ color: 'var(--subtle)' }}>
          No active deal was found for ID <code className="mono">{dealIdParam.slice(0, 18)}...</code> on {chain?.name ?? 'Arc'}. The link may be expired, already claimed, or was created on another network.
        </p>
      </div>
    )
  }

  const alreadyClaimed = deal.state !== DealState.Proposed
  const { interest, total } = computeRepayment(deal.principal, deal.rateBps, deal.durationMonths)

  // Determine which role the claimer will take
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
    if (!hasValidId || !salt || !address) return
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'claimDeal',
      args: [normalizedDealId, salt],
      chainId,
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
              : `Share this invitation link with your counterparty (${claimerRole}) so they can connect and seal the deal.`}
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

      {/* Terms */}
      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--subtle)' }}>
          Loan Terms
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
            <span style={{ color: 'var(--subtle)' }}>Proposer ({borrowerSet ? 'Borrower' : 'Lender'})</span>
            <code className="mono" style={{ color: 'var(--muted)' }}>
              {shortAddr(borrowerSet ? deal.borrower : deal.lender)}
            </code>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--subtle)' }}>
              {isProposer ? 'Your Status' : `You will be (${claimerRole})`}
            </span>
            <code className="mono" style={{ color: isProposer ? 'var(--brand)' : 'var(--accent)' }}>
              {isProposer
                ? `Creator (${isBorrower ? 'Borrower' : 'Lender'})`
                : isConnected
                ? shortAddr(address!)
                : '— connect wallet'}
            </code>
          </div>
          {deal.reservedFor !== '0x0000000000000000000000000000000000000000' && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--subtle)' }}>Reserved for</span>
              <code className="mono" style={{ color: 'var(--muted)' }}>
                {shortAddr(deal.reservedFor)}
              </code>
            </div>
          )}
        </div>
      </Card>

      {/* Warnings */}
      {isReservedForOther && isConnected && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          <AlertTriangle size={14} />
          This link is reserved for a specific wallet address ({shortAddr(deal.reservedFor)}). Your connected wallet is not authorised to claim it.
        </div>
      )}

      {alreadyClaimed && !isSuccess && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
        >
          <Shield size={14} />
          This deal has already been sealed and claimed (state: {dealStateLabel(deal.state)}).
        </div>
      )}

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
          disabled={isReservedForOther || isPending || isConfirming || isSuccess}
          onClick={claim}
        >
          {isPending
            ? 'Confirm in wallet...'
            : isConfirming
            ? 'Confirming on Arc...'
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
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--success)' }}>
            Deal successfully sealed on-chain!
          </p>
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
