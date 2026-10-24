import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { AlertTriangle, Zap, RotateCcw, ShieldCheck, ShieldAlert, ArrowDown, XCircle, Check } from 'lucide-react'
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
} from '../lib/utils'
import {
  REGISTRY_ADDRESS,
  VAULT_ADDRESS,
  CIRBTC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
} from '../contracts/addresses'
import { REGISTRY_ABI, VAULT_ABI, ERC20_APPROVE_ABI } from '../contracts/abis'
import { requireChain, getUsdc } from '@/onchain-facts'

const chain = requireChain(ARC_TESTNET_CHAIN_ID)
const usdcFact = getUsdc(ARC_TESTNET_CHAIN_ID)!
// Computed once at module load — stable reference safe to use in render
const PAGE_LOAD_SEC = Math.floor(new Date().valueOf() / 1000)

type Action = 'activateLoan' | 'claimPrincipal' | 'repayLoan' | 'liquidate' | 'markDefault'

export default function ManageDeal() {
  const { id: dealId } = useParams<{ id: string }>()
  const { address, isConnected, chainId } = useAccount()
  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const isValidHexId = Boolean(dealId && dealId.startsWith('0x') && dealId.length === 66)
  const safeDealId = (isValidHexId ? dealId : '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`

  const { data: deal, isLoading, refetch } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'getDeal',
    args: [safeDealId],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: isValidHexId },
  })

  const { data: lockedCollateral } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'lockedCollateral',
    args: [safeDealId],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: isValidHexId && deal?.state === DealState.Active },
  })

  const { data: claimableUsdc } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'claimableUsdc',
    args: [safeDealId],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: isValidHexId && deal?.state === DealState.Active },
  })

  // cirBTC allowance check (borrower needs to approve vault before activating)
  const { data: cirBtcAllowance } = useReadContract({
    address: CIRBTC_ADDRESS,
    abi: ERC20_APPROVE_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', VAULT_ADDRESS],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && deal?.state === DealState.Confirmed },
  })

  // USDC allowance check (borrower needs to approve vault before repaying; lender before activating)
  const { data: usdcAllowance } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: ERC20_APPROVE_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', VAULT_ADDRESS],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && deal?.state === DealState.Confirmed },
  })

  // Counter-offers (only relevant for proposer on Proposed deals)
  const { data: counterOffers, refetch: refetchOffers } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'getCounterOffers',
    args: [dealId as `0x${string}`],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!dealId && deal?.state === DealState.Proposed },
  })

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      void refetch()
      void refetchOffers()
      toast.success('Transaction confirmed')
    }
  }, [isSuccess, refetch, refetchOffers])

  if (!dealId || !isValidHexId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={36} className="mx-auto mb-4 text-[#ff8a00]" />
        <h2 className="font-['Space_Grotesk'] text-xl font-bold mb-2 text-[#ebe0d9]">
          Invalid Deal Identifier
        </h2>
        <p className="text-sm text-[#ddc1ae] max-w-md mx-auto mb-6">
          The requested Deal ID (<code className="mono text-[#ff8a00]">{dealId || 'empty'}</code>) is not a 32-byte cryptographic hash. On Arc, deal identifiers are 66-character hashes (e.g. <code>0x8f9024a...</code>).
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/dashboard" className="px-5 py-2.5 rounded-full bg-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold no-underline">
            Back to Dashboard
          </Link>
          <Link to="/marketplace" className="px-5 py-2.5 rounded-full bg-[#241f1a] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 no-underline">
            Browse Marketplace
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="animate-pulse h-48" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-[#ff8a00]" />
        <p className="text-sm text-[#ddc1ae] mb-4">No deal found on Arc Testnet for ID: <code className="mono text-[#ff8a00]">{dealId}</code></p>
        <Link to="/dashboard" className="px-4 py-2 rounded-full bg-[#241f1a] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 no-underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const { interest, total } = computeRepayment(deal.principal, deal.rateBps, deal.durationMonths)
  const isBorrower = address?.toLowerCase() === deal.borrower.toLowerCase()
  const isLender = address?.toLowerCase() === deal.lender.toLowerCase()

  // Approvals needed
  const needsCirBtcApproval = isBorrower && deal.state === DealState.Confirmed &&
    (cirBtcAllowance === undefined || cirBtcAllowance < deal.collateral)
  const needsUsdcApproval = isLender && deal.state === DealState.Confirmed &&
    (usdcAllowance === undefined || usdcAllowance < deal.principal)

  function dispatch(action: Action) {
    if (!dealId || !address) return
    reset()
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: action,
      args: [dealId as `0x${string}`],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  function cancelDeal() {
    if (!dealId || !address) return
    reset()
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'cancelDeal',
      args: [dealId as `0x${string}`],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  function acceptOffer(offerId: bigint) {
    if (!dealId || !address) return
    reset()
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'acceptCounterOffer',
      args: [dealId as `0x${string}`, offerId],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  function approveToken(token: 'cirBtc' | 'usdc', amount: bigint) {
    if (!address) return
    reset()
    writeContract({
      address: token === 'cirBtc' ? CIRBTC_ADDRESS : (usdcFact.address as `0x${string}`),
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, amount],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  const maturityTs = deal.activatedAt > 0n
    ? Number(deal.activatedAt) + Number(deal.durationMonths) * 30 * 24 * 3600
    : null
  const isPastMaturity = maturityTs !== null && PAGE_LOAD_SEC > maturityTs

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Manage Loan
          </h1>
          <code className="mono text-xs" style={{ color: 'var(--subtle)' }}>
            {dealId}
          </code>
        </div>
        <Badge className={dealStateColor(deal.state)}>
          {dealStateLabel(deal.state)}
        </Badge>
      </div>

      {/* Terms */}
      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--subtle)' }}>
          Loan Terms
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Principal" value={`$${formatUsdc(deal.principal)}`} />
          <Stat label="Rate" value={formatBps(deal.rateBps)} sub="per year" />
          <Stat label="Duration" value={`${deal.durationMonths}mo`} />
          <Stat label="Total Due" value={`$${formatUsdc(total)}`} sub={`+$${formatUsdc(interest)} interest`} />
        </div>
      </Card>

      {/* Parties */}
      <Card className="mb-4">
        <div className="space-y-2 text-sm">
          {[
            ['Borrower', deal.borrower, isBorrower],
            ['Lender', deal.lender, isLender],
          ].map(([role, addr, isYou]) => (
            <div key={role as string} className="flex justify-between items-center">
              <span style={{ color: 'var(--subtle)' }}>
                {role as string}{isYou ? ' (you)' : ''}
              </span>
              <code className="mono text-xs" style={{ color: isYou ? 'var(--accent)' : 'var(--muted)' }}>
                {addr === '0x0000000000000000000000000000000000000000'
                  ? '—'
                  : shortAddr(addr as string)}
              </code>
            </div>
          ))}
          {deal.activatedAt > 0n && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--subtle)' }}>Maturity</span>
              <span className="text-xs" style={{ color: isPastMaturity ? 'var(--danger)' : 'var(--muted)' }}>
                {maturityTs
                  ? new Date(maturityTs * 1000).toLocaleDateString()
                  : '—'}{' '}
                {isPastMaturity ? '(matured)' : ''}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Counter-offers (proposer view, Proposed state) */}
      {deal.state === DealState.Proposed && (isBorrower || isLender) && (
        <Card className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
            Counter-Offers
          </p>
          {!counterOffers || counterOffers.filter((o) => o.active).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              No counter-offers yet. Share the deal on the{' '}
              <Link to="/marketplace" className="underline" style={{ color: 'var(--accent)' }}>
                Marketplace
              </Link>{' '}
              to receive them.
            </p>
          ) : (
            <div className="space-y-2">
              {counterOffers.filter((o) => o.active).map((o) => (
                <div
                  key={o.offerId.toString()}
                  className="flex items-center justify-between rounded-xl p-3 border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}
                >
                  <div className="text-xs space-y-0.5">
                    <p style={{ color: 'var(--subtle)' }}>
                      From <span className="mono" style={{ color: 'var(--muted)' }}>{shortAddr(o.proposer)}</span>
                    </p>
                    <p style={{ color: 'var(--ink)' }}>
                      ${formatUsdc(o.principal)} · {formatBtc(o.collateral)} BTC · {formatBps(o.rateBps)} · {o.durationMonths}mo
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isPending || isConfirming}
                    onClick={() => acceptOffer(o.offerId)}
                  >
                    <Check size={12} />
                    Accept
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* LTV gauge (active only) */}
      {deal.state === DealState.Active && lockedCollateral !== undefined && (
        <Card className="mb-4">
          {/* Placeholder LTV — real LTV needs oracle price. Show collateral locked. */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--subtle)' }}>
            Collateral Locked
          </p>
          <p className="display text-xl font-bold tabular-nums mb-1" style={{ color: 'var(--brand)' }}>
            {formatBtc(lockedCollateral)} cirBTC
          </p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Liquidation triggers at 80% LTV. Oracle price needed for live calculation.
          </p>
          {claimableUsdc !== undefined && claimableUsdc > 0n && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Unclaimed principal:{' '}
                <strong style={{ color: 'var(--accent)' }}>${formatUsdc(claimableUsdc)}</strong>
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Proposed/Confirmed — cancel (proposer only) */}
        {(deal.state === DealState.Proposed || deal.state === DealState.Confirmed) &&
          (isBorrower || isLender) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full border"
            style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
            disabled={isPending || isConfirming}
            onClick={cancelDeal}
          >
            <XCircle size={13} />
            Cancel Deal
          </Button>
        )}

        {/* Confirmed — approve + activate */}
        {deal.state === DealState.Confirmed && isBorrower && (
          <>
            {needsCirBtcApproval && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={isPending || isConfirming}
                onClick={() => approveToken('cirBtc', deal.collateral)}
              >
                <ShieldCheck size={15} />
                Approve cirBTC for Vault
              </Button>
            )}
            {!needsCirBtcApproval && needsUsdcApproval && (
              <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
                Waiting for lender to approve USDC...
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={needsCirBtcApproval || isPending || isConfirming}
              onClick={() => dispatch('activateLoan')}
            >
              <Zap size={15} />
              Activate Loan
            </Button>
          </>
        )}

        {deal.state === DealState.Confirmed && isLender && needsUsdcApproval && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => approveToken('usdc', deal.principal)}
          >
            <ShieldCheck size={15} />
            Approve USDC for Vault
          </Button>
        )}

        {/* Active — claim principal (borrower) */}
        {deal.state === DealState.Active && isBorrower && claimableUsdc !== undefined && claimableUsdc > 0n && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => dispatch('claimPrincipal')}
          >
            <ArrowDown size={15} />
            Claim ${formatUsdc(claimableUsdc)} USDC
          </Button>
        )}

        {/* Active — repay */}
        {(deal.state === DealState.Active || deal.state === DealState.Defaulted) && isBorrower && (
          <Button
            variant={deal.state === DealState.Defaulted ? 'danger' : 'secondary'}
            size="lg"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => dispatch('repayLoan')}
          >
            <RotateCcw size={15} />
            Repay ${formatUsdc(total)}
          </Button>
        )}

        {/* Active — mark default */}
        {deal.state === DealState.Active && isPastMaturity && (
          <Button
            variant="danger"
            size="lg"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => dispatch('markDefault')}
          >
            <ShieldAlert size={15} />
            Mark Default
          </Button>
        )}

        {/* Active/Defaulted — liquidate (anyone) */}
        {(deal.state === DealState.Active || deal.state === DealState.Defaulted) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full border"
            style={{ borderColor: 'var(--border)' }}
            disabled={isPending || isConfirming}
            onClick={() => dispatch('liquidate')}
          >
            <Zap size={13} />
            Trigger Liquidation (permissionless)
          </Button>
        )}
      </div>

      {/* TX status */}
      {(isPending || isConfirming || isSuccess || error) && (
        <div className="mt-4">
          <TxStatus
            isPending={isPending}
            isConfirming={isConfirming}
            isSuccess={isSuccess}
            error={error ? parseOnchainError(error) : null}
            explorerUrl={hash ? `${chain.explorerBase}/tx/${hash}` : undefined}
          />
        </div>
      )}

      {/* Chain guard */}
      {!isConnected && (
        <div className="mt-4 rounded-xl p-3 text-sm text-center" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
          Connect your wallet to manage this deal
        </div>
      )}
      {isConnected && isWrongChain && (
        <div className="mt-4 rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
          Switch to Arc Testnet (chain ID 5042002)
        </div>
      )}
    </div>
  )
}
