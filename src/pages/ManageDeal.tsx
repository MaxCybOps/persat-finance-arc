// oxlint-disable
import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { AlertTriangle, Zap, RotateCcw, ShieldCheck, ShieldAlert, XCircle, Check, Download, PauseCircle } from 'lucide-react'
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
import { REGISTRY_ABI, VAULT_ABI, ERC20_APPROVE_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { useBtcPrice } from '../hooks/useBtcPrice'
import GetFundsPanel from '../components/GetFundsPanel'
import { getArcClient } from '../lib/arcClient'

const PAGE_LOAD_SEC = Math.floor(new Date().valueOf() / 1000)
const ZERO = '0x0000000000000000000000000000000000000000' as const

type Action = 'activateLoan' | 'repayLoan' | 'liquidate' | 'markDefault'

const LATE_FEE_BPS = 200n
const LIQUIDATION_BONUS_BPS = 300n

const GAS: Record<Action, bigint> = {
  activateLoan: 450_000n,
  repayLoan: 350_000n,
  liquidate: 450_000n,
  markDefault: 120_000n,
}

const PAUSED_ABI = [
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
] as const

export default function ManageDeal() {
  const { id: dealIdParam } = useParams<{ id: string }>()
  const { address, isConnected, isWrongChain, chain, addresses, chainId } = useArcNetwork()
  const { priceUsd: btcPrice, hasPrice, source: priceSource, isStale: priceStale } = useBtcPrice()

  const hasValidId = isValidDealId(dealIdParam)
  const normalizedDealId = normalizeDealId(dealIdParam)

  const { data: deal, isLoading, refetch, error: readError } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'getDeal',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId, retry: false },
  })

  const isOpenLoan = deal?.state === DealState.Active || deal?.state === DealState.Defaulted

  const { data: lockedCollateral } = useReadContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    functionName: 'lockedCollateral',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && isOpenLoan },
  })

  const { data: amountDue, refetch: refetchDue } = useReadContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    functionName: 'amountDue',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && isOpenLoan, refetchInterval: 60_000 },
  })

  const { data: liquidationOpensAt } = useReadContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    functionName: 'liquidationOpensAt',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && isOpenLoan },
  })

  const { data: liquidationThresholdBps } = useReadContract({
    address: addresses.vault, abi: VAULT_ABI, functionName: 'liquidationThresholdBps', chainId,
  })
  const { data: maxInitialLtvBps } = useReadContract({
    address: addresses.vault, abi: VAULT_ABI, functionName: 'maxInitialLtvBps', chainId,
  })

  const { data: activationDeadline } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'activationDeadline',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && deal?.state === DealState.Confirmed },
  })

  const { data: isExpired } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'isExpired',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && deal?.state === DealState.Proposed },
  })

  const { data: claimableUsdc, refetch: refetchClaimUsdc } = useReadContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    functionName: 'claimable',
    args: [addresses.usdc, address ?? ZERO],
    chainId,
    query: { enabled: !!address },
  })
  const { data: claimableCirBtc, refetch: refetchClaimBtc } = useReadContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    functionName: 'claimable',
    args: [addresses.cirBtc, address ?? ZERO],
    chainId,
    query: { enabled: !!address },
  })

  const { data: usdcPaused } = useReadContract({
    address: addresses.usdc, abi: PAUSED_ABI, functionName: 'paused', chainId,
    query: { enabled: isOpenLoan, retry: false },
  })
  const { data: cirBtcPaused } = useReadContract({
    address: addresses.cirBtc, abi: PAUSED_ABI, functionName: 'paused', chainId,
    query: { enabled: isOpenLoan, retry: false },
  })
  const tokenPaused = usdcPaused === true || cirBtcPaused === true

  const { data: cirBtcAllowance, refetch: refetchCirBtcAllowance } = useReadContract({
    address: addresses.cirBtc,
    abi: ERC20_APPROVE_ABI,
    functionName: 'allowance',
    args: [address ?? ZERO, addresses.vault],
    chainId,
    query: { enabled: !!address && deal?.state === DealState.Confirmed },
  })

  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: addresses.usdc,
    abi: ERC20_APPROVE_ABI,
    functionName: 'allowance',
    args: [address ?? ZERO, addresses.vault],
    chainId,
    query: { enabled: !!address && (deal?.state === DealState.Confirmed || isOpenLoan) },
  })

  const { data: counterOffers, refetch: refetchOffers } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'getCounterOffers',
    args: [normalizedDealId],
    chainId,
    query: { enabled: hasValidId && deal?.state === DealState.Proposed },
  })

  const { writeContract: rawWrite, data: hash, isPending, error, reset } = useWriteContract()

  // Simulate first so a call that would revert shows its real reason instead of failing on-chain.
  const writeContract = (params: any) => {
    if (!address) return
    const { gas: _gas, chainId: _chainId, ...call } = params
    getArcClient()
      .simulateContract({ ...call, account: address })
      .then(() => rawWrite(params))
      .catch((e: unknown) => toast.error(parseOnchainError(e), { duration: 8000 }))
  }

  useEffect(() => {
    if (error) toast.error(parseOnchainError(error), { duration: 8000 })
  }, [error])

  const { isLoading: isConfirming, isSuccess: receiptReady, data: receipt } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: Boolean(hash) },
  })
  const isSuccess = receiptReady && receipt?.status === 'success'
  const reverted = receiptReady && receipt?.status === 'reverted'

  useEffect(() => {
    if (reverted) toast.error('Transaction failed on-chain. Nothing was changed.', { duration: 8000 })
  }, [reverted])

  useEffect(() => {
    if (isSuccess) {
      void refetch()
      void refetchOffers()
      void refetchDue()
      void refetchUsdcAllowance()
      void refetchCirBtcAllowance()
      void refetchClaimUsdc()
      void refetchClaimBtc()
      toast.success('Transaction confirmed')
    }
  }, [isSuccess, refetch, refetchOffers, refetchDue, refetchUsdcAllowance, refetchCirBtcAllowance, refetchClaimUsdc, refetchClaimBtc])

  if (!dealIdParam || !hasValidId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={36} className="mx-auto mb-4 text-[#ff8a00]" />
        <h2 className="font-['Space_Grotesk'] text-xl font-bold mb-2 text-[#ebe0d9]">
          Invalid Deal Identifier
        </h2>
        <p className="text-sm text-[#ddc1ae] max-w-md mx-auto mb-6">
          The requested Deal ID (<code className="mono text-[#ff8a00]">{dealIdParam || 'empty'}</code>) is not a valid 16-byte deal identifier. On Arc, deal identifiers are 34-character hexadecimal hashes (e.g. <code>0x8f9024a...</code>).
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

  if (!deal || readError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-[#ff8a00]" />
        <p className="text-sm text-[#ddc1ae] mb-4">No deal found on {chain?.name ?? 'Arc'} for ID: <code className="mono text-[#ff8a00]">{dealIdParam}</code></p>
        <Link to="/dashboard" className="px-4 py-2 rounded-full bg-[#241f1a] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 no-underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const { interest, total } = computeRepayment(deal.principal, deal.rateBps, deal.durationMonths)
  const isBorrower = address?.toLowerCase() === deal.borrower.toLowerCase()
  const isLender = address?.toLowerCase() === deal.lender.toLowerCase()

  const needsCirBtcApproval = isBorrower && deal.state === DealState.Confirmed &&
    (cirBtcAllowance === undefined || cirBtcAllowance < deal.collateral)
  const needsUsdcApproval = isLender && deal.state === DealState.Confirmed &&
    (usdcAllowance === undefined || usdcAllowance < deal.principal)

  const dueNow = amountDue ?? total
  const repayApprovalAmount = total + (deal.principal * LATE_FEE_BPS) / 10_000n
  const needsRepayApproval = isBorrower && isOpenLoan &&
    (usdcAllowance === undefined || usdcAllowance < dueNow)

  const collateralUsd = lockedCollateral !== undefined && hasPrice
    ? Number(lockedCollateral) / 1e8 * btcPrice
    : null
  const ltvPct = collateralUsd && collateralUsd > 0 ? (Number(dueNow) / 1e6) / collateralUsd * 100 : null
  const liqPct = liquidationThresholdBps !== undefined ? Number(liquidationThresholdBps) / 100 : 80
  const maxInitPct = maxInitialLtvBps !== undefined ? Number(maxInitialLtvBps) / 100 : 65
  const healthColor = ltvPct === null ? 'var(--subtle)'
    : ltvPct >= liqPct ? 'var(--danger)'
    : ltvPct >= liqPct - 10 ? '#f59e0b'
    : 'var(--success)'

  const liquidationRepay = collateralUsd !== null
    ? (() => {
        const maxRepay = BigInt(Math.floor(collateralUsd * 1e6)) * 10_000n / (10_000n + LIQUIDATION_BONUS_BPS)
        return dueNow < maxRepay ? dueNow : maxRepay
      })()
    : dueNow
  const isThirdParty = !!address && !isLender && !isBorrower
  const needsLiquidationApproval = isOpenLoan && isThirdParty &&
    (usdcAllowance === undefined || usdcAllowance < liquidationRepay)

  const opensAt = liquidationOpensAt !== undefined ? Number(liquidationOpensAt) : null
  const maturityTs = deal.activatedAt > 0n
    ? Number(deal.activatedAt) + Number(deal.durationMonths) * 30 * 24 * 3600
    : null
  const isPastMaturity = maturityTs !== null && PAGE_LOAD_SEC > maturityTs
  const isPastGrace = opensAt !== null && PAGE_LOAD_SEC > opensAt
  const deadlineTs = activationDeadline !== undefined && activationDeadline > 0n ? Number(activationDeadline) : null
  const activationClosed = deadlineTs !== null && PAGE_LOAD_SEC > deadlineTs

  const hasClaimable = (claimableUsdc ?? 0n) > 0n || (claimableCirBtc ?? 0n) > 0n

  function dispatch(action: Action) {
    if (!hasValidId || !address) return
    reset()
    writeContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: action,
      args: [normalizedDealId],
      chainId,
      gas: GAS[action],
    })
  }

  function cancelDeal() {
    if (!hasValidId || !address) return
    reset()
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'cancelDeal',
      args: [normalizedDealId],
      chainId,
      gas: 100_000n,
    })
  }

  function acceptOffer(offerId: bigint) {
    if (!hasValidId || !address) return
    reset()
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'acceptCounterOffer',
      args: [normalizedDealId, offerId],
      chainId,
      gas: 300_000n,
    })
  }

  function approveToken(token: 'cirBtc' | 'usdc', amount: bigint) {
    if (!address) return
    reset()
    writeContract({
      address: token === 'cirBtc' ? addresses.cirBtc : addresses.usdc,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [addresses.vault, amount],
      chainId,
      gas: 100_000n,
    })
  }

  function withdraw(token: `0x${string}`) {
    if (!address) return
    reset()
    writeContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [token],
      chainId,
      gas: 150_000n,
    })
  }

  function notePause() {
    reset()
    writeContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'notePause',
      chainId,
      gas: 120_000n,
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Manage Loan
          </h1>
          <code className="mono text-xs" style={{ color: 'var(--subtle)' }}>
            {normalizedDealId}
          </code>
        </div>
        <Badge className={dealStateColor(deal.state)}>
          {isExpired ? 'Expired' : dealStateLabel(deal.state)}
        </Badge>
      </div>

      {hasClaimable && (
        <Card className="mb-4 border border-[var(--success)]/40">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--subtle)' }}>
            Funds waiting for you
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
            A payment to your address could not be delivered directly (for example during a token pause or freeze),
            so the vault is holding it for you. It stays yours until you withdraw it.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {(claimableUsdc ?? 0n) > 0n && (
              <Button variant="primary" size="sm" className="flex-1" disabled={isPending || isConfirming} onClick={() => withdraw(addresses.usdc)}>
                <Download size={13} />
                Withdraw {formatUsdc(claimableUsdc!)} USDC
              </Button>
            )}
            {(claimableCirBtc ?? 0n) > 0n && (
              <Button variant="primary" size="sm" className="flex-1" disabled={isPending || isConfirming} onClick={() => withdraw(addresses.cirBtc)}>
                <Download size={13} />
                Withdraw {formatBtc(claimableCirBtc!)} cirBTC
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--subtle)' }}>
          Loan Terms
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Principal" value={`$${formatUsdc(deal.principal)}`} />
          <Stat label="Rate" value={formatBps(deal.rateBps)} sub="per year" />
          <Stat label="Duration" value={`${deal.durationMonths}mo`} />
          {isOpenLoan ? (
            <Stat label="Due Now" value={`$${formatUsdc(dueNow)}`} sub={`max $${formatUsdc(total)} at maturity`} />
          ) : (
            <Stat label="Max Total Due" value={`$${formatUsdc(total)}`} sub={`+$${formatUsdc(interest)} interest`} />
          )}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--subtle)' }}>
          Interest accrues pro rata with a one-month minimum, so repaying early costs less.
        </p>
      </Card>

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
                {addr === ZERO ? '—' : shortAddr(addr as string)}
              </code>
            </div>
          ))}
          {deal.activatedAt > 0n && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--subtle)' }}>Maturity</span>
              <span className="text-xs" style={{ color: isPastMaturity ? 'var(--danger)' : 'var(--muted)' }}>
                {maturityTs ? new Date(maturityTs * 1000).toLocaleDateString() : '—'}{' '}
                {isPastMaturity ? '(matured)' : ''}
              </span>
            </div>
          )}
          {opensAt !== null && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--subtle)' }}>Overdue liquidation opens</span>
              <span className="text-xs" style={{ color: isPastGrace ? 'var(--danger)' : 'var(--muted)' }}>
                {new Date(opensAt * 1000).toLocaleString()}
              </span>
            </div>
          )}
          {deal.state === DealState.Confirmed && deadlineTs !== null && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--subtle)' }}>Activate before</span>
              <span className="text-xs" style={{ color: activationClosed ? 'var(--danger)' : 'var(--muted)' }}>
                {new Date(deadlineTs * 1000).toLocaleString()} {activationClosed ? '(window closed)' : ''}
              </span>
            </div>
          )}
        </div>
      </Card>

      {deal.state === DealState.Proposed && (isBorrower || isLender) && (
        <Card className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
            Counter-Offers
          </p>
          {isExpired ? (
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              This order has expired (30 days). Cancel it and post a new one with current terms.
            </p>
          ) : !counterOffers || counterOffers.filter((o) => o.active).length === 0 ? (
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
                      ${formatUsdc(o.principal)} · {formatBtc(o.collateral)} cirBTC · {formatBps(o.rateBps)} · {o.durationMonths}mo
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

      {isOpenLoan && lockedCollateral !== undefined && (
        <Card className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--subtle)' }}>
            Loan Health
          </p>
          <div className="flex items-baseline justify-between mb-2">
            <p className="display text-xl font-bold tabular-nums" style={{ color: healthColor }}>
              {ltvPct === null ? 'LTV unavailable' : `LTV ${ltvPct.toFixed(1)}%`}
            </p>
            <p className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
              {formatBtc(lockedCollateral)} cirBTC
              {collateralUsd !== null && ` ≈ $${collateralUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </p>
          </div>
          {ltvPct !== null && (
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface-muted)' }}>
              <div className="h-full" style={{ width: `${Math.min(ltvPct / liqPct * 100, 100)}%`, background: healthColor }} />
            </div>
          )}
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Liquidation opens at {liqPct}% LTV, or once the overdue date above has passed. A 2% late fee applies after maturity.
            BTC price: {hasPrice ? `$${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'} ({priceSource}{priceStale ? ', stale' : ''}).
            Collateral is valued at the BTC price; new loans are blocked if cirBTC trades more than 2% away from it.
          </p>
        </Card>
      )}

      {isOpenLoan && tokenPaused && (
        <Card className="mb-4 border border-[#f59e0b]/40">
          <div className="flex items-start gap-2 text-xs" style={{ color: '#f59e0b' }}>
            <PauseCircle size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">{usdcPaused ? 'USDC' : 'cirBTC'} is currently paused by its issuer.</p>
              <p className="mb-2" style={{ color: 'var(--subtle)' }}>
                Liquidations are blocked during a pause. Recording it on-chain gives borrowers a 3-day window to repay
                after the pause ends, and waives the late fee if the pause started during the grace period.
              </p>
              <Button variant="secondary" size="sm" disabled={isPending || isConfirming} onClick={notePause}>
                Record the pause on-chain
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
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

        {deal.state === DealState.Confirmed && isBorrower && (
          <>
            <GetFundsPanel
              need="cirBtc"
              required={deal.collateral}
              title="Need cirBTC for the collateral?"
            />
            {needsCirBtcApproval && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={isPending || isConfirming || activationClosed}
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
              disabled={needsCirBtcApproval || isPending || isConfirming || activationClosed}
              onClick={() => dispatch('activateLoan')}
            >
              <Zap size={15} />
              {activationClosed ? 'Activation window closed' : 'Activate Loan'}
            </Button>
            <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
              Activation requires a loan-to-value of at most {maxInitPct}% at the current BTC price and must happen within
              72 hours of the deal being confirmed. The principal (minus the protocol fee) is sent straight to your wallet.
            </p>
          </>
        )}

        {deal.state === DealState.Confirmed && isLender && (
          <>
            <GetFundsPanel need="usdc" required={deal.principal} title="Need USDC on Arc to fund this loan?" />
            {needsUsdcApproval && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={isPending || isConfirming || activationClosed}
                onClick={() => approveToken('usdc', deal.principal)}
              >
                <ShieldCheck size={15} />
                Approve USDC for Vault
              </Button>
            )}
          </>
        )}

        {needsRepayApproval && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => approveToken('usdc', repayApprovalAmount)}
          >
            <ShieldCheck size={15} />
            Approve USDC for Repayment
          </Button>
        )}

        {isOpenLoan && isBorrower && (
          <Button
            variant={deal.state === DealState.Defaulted ? 'danger' : 'secondary'}
            size="lg"
            className="w-full"
            disabled={needsRepayApproval || isPending || isConfirming}
            onClick={() => dispatch('repayLoan')}
          >
            <RotateCcw size={15} />
            Repay ${formatUsdc(dueNow)}{isPastMaturity ? ' (incl. late fee if due)' : ''}
          </Button>
        )}

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

        {isOpenLoan && needsLiquidationApproval && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={isPending || isConfirming}
            onClick={() => approveToken('usdc', dueNow)}
          >
            <ShieldCheck size={13} />
            Approve up to ${formatUsdc(dueNow)} USDC to liquidate
          </Button>
        )}

        {isOpenLoan && !isBorrower && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full border"
            style={{ borderColor: 'var(--border)' }}
            disabled={isPending || isConfirming || tokenPaused || needsLiquidationApproval}
            onClick={() => dispatch('liquidate')}
          >
            <Zap size={13} />
            {isLender
              ? (isPastGrace ? 'Liquidate overdue loan (receive cirBTC)' : 'Trigger liquidation (receive cirBTC)')
              : (isPastGrace ? 'Liquidate overdue loan (repay lender in USDC)' : 'Trigger liquidation (repay lender in USDC)')}
          </Button>
        )}
        {isOpenLoan && !isBorrower && (
          <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
            A liquidator repays the lender in USDC and receives the matching cirBTC plus a 3% bonus; any surplus
            goes back to the borrower. The lender can also liquidate directly and take the cirBTC instead.
          </p>
        )}
      </div>

      {(isPending || isConfirming || isSuccess || reverted || error) && (
        <div className="mt-4">
          <TxStatus
            isPending={isPending}
            isConfirming={isConfirming}
            isSuccess={isSuccess}
            error={error ? parseOnchainError(error) : reverted ? 'Transaction failed on-chain. Nothing was changed.' : null}
            explorerUrl={hash ? `${chain.blockExplorers.default.url}/tx/${hash}` : undefined}
          />
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 rounded-xl p-3 text-sm text-center" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
          Connect your wallet to manage this deal
        </div>
      )}
      {isConnected && isWrongChain && (
        <div className="mt-4 rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
          Switch your wallet to Arc Mainnet (chain ID 5042)
        </div>
      )}
    </div>
  )
}
