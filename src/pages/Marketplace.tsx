// oxlint-disable
import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useModal } from 'connectkit'
import { toast } from 'sonner'
import { Filter, Plus, X, RefreshCw, ExternalLink, Send, ChevronDown } from 'lucide-react'
import { Card, Button, Badge, Input, TxStatus } from '../components/ui'
import {
  formatUsdc,
  formatBtc,
  formatBps,
  parseUsdc,
  parseBtc,
  DealState,
  parseOnchainError,
  normalizeDealId,
  computeRltv,
} from '../lib/utils'
import { REGISTRY_ABI, VAULT_ABI } from '../contracts/abis'
import { useBtcPrice } from '../hooks/useBtcPrice'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { getArcClient } from '../lib/arcClient'

const ZERO = '0x0000000000000000000000000000000000000000'
const SCAN_PAGE = 100n
const MIN_PRINCIPAL = 100_000_000n

type RoleFilter = 'all' | 'borrow' | 'lend'

interface OpenOrder {
  dealId: `0x${string}`
  borrower: `0x${string}`
  lender: `0x${string}`
  principal: bigint
  collateral: bigint
  rateBps: bigint
  durationMonths: number
}

interface OfferForm {
  principal: string
  collateral: string
  rateBps: string
  durationMonths: string
}

const usd = (raw: bigint) => `$${formatUsdc(raw).replace(/\.00$/, '')}`
const btc = (raw: bigint) => formatBtc(raw).replace(/\.?0+$/, '')
const isBorrowRequest = (o: OpenOrder) => o.borrower !== ZERO

function CounterOfferModal({ order, onClose, onSubmitted }: { order: OpenOrder; onClose: () => void; onSubmitted: () => void }) {
  const { isWrongChain, addresses, chainId, chain, address, isMainnet } = useArcNetwork()
  const { setOpen: openConnect } = useModal()
  const { priceUsd: btcPrice, hasPrice } = useBtcPrice()
  const { data: maxInitialLtvBps } = useReadContract({
    address: addresses.vault, abi: VAULT_ABI, functionName: 'maxInitialLtvBps', chainId,
  })
  const maxPct = maxInitialLtvBps !== undefined ? Number(maxInitialLtvBps) / 100 : 65
  const [form, setForm] = useState<OfferForm>({
    principal: formatUsdc(order.principal).replace(/,/g, '').replace(/\.00$/, ''),
    collateral: btc(order.collateral),
    rateBps: String(Number(order.rateBps) / 100),
    durationMonths: String(order.durationMonths),
  })
  const set = (k: keyof OfferForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { writeContract: rawWrite, data: hash, isPending, error } = useWriteContract()
  const [simError, setSimError] = useState<string | null>(null)
  const writeContract = (params: any) => {
    if (!address) return
    setSimError(null)
    const { gas: _gas, chainId: _chainId, ...call } = params
    getArcClient(isMainnet)
      .simulateContract({ ...call, account: address })
      .then(() => rawWrite(params))
      .catch((e: unknown) => setSimError(parseOnchainError(e)))
  }
  const { isLoading: isConfirming, isSuccess: receiptReady, data: receipt } = useWaitForTransactionReceipt({ hash, chainId, query: { enabled: Boolean(hash) } })
  const isSuccess = receiptReady && receipt?.status === 'success'
  const reverted = receiptReady && receipt?.status === 'reverted'

  useEffect(() => { if (isSuccess) onSubmitted() }, [isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  const principalRaw = parseUsdc(form.principal)
  const collateralRaw = parseBtc(form.collateral)
  const rateBpsRaw = BigInt(Math.round(parseFloat(form.rateBps || '0') * 100))
  const duration = parseInt(form.durationMonths || '0')
  const isValid = principalRaw >= MIN_PRINCIPAL && collateralRaw > 0n && rateBpsRaw > 0n && duration > 0 && duration <= 24
  const offerToLend = isBorrowRequest(order)
  const rltv = hasPrice ? computeRltv(collateralRaw, btcPrice, principalRaw, rateBpsRaw, duration) : 0
  const ltvTooHigh = hasPrice && rltv > maxPct
  const asPosted =
    principalRaw === order.principal && collateralRaw === order.collateral &&
    rateBpsRaw === order.rateBps && duration === order.durationMonths

  function submit() {
    if (!isValid) return
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'submitCounterOffer',
      args: [order.dealId, principalRaw, collateralRaw, rateBpsRaw, duration],
      chainId,
      gas: 300_000n,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Make an offer"
    >
      <Card className="w-full max-w-md max-h-[90svh] overflow-y-auto" style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Make an offer</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 cursor-pointer"><X size={16} style={{ color: 'var(--subtle)' }} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
          Send the posted terms as they are, or change them. The creator of the order picks one offer. If yours is
          chosen, the deal appears in your Dashboard, ready to activate. Your offer stays valid for 7 days unless you
          cancel it.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 mb-4">
          <div className="col-span-2 sm:col-span-1">
            <Input label="Amount" suffix="USDC" placeholder="1000" value={form.principal} onChange={set('principal')} type="number" min="100" inputMode="decimal" error={form.principal && principalRaw < MIN_PRINCIPAL ? 'Minimum 100 USDC.' : undefined} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Input label="Collateral" suffix="cirBTC" placeholder="0.03" value={form.collateral} onChange={set('collateral')} type="number" min="0" inputMode="decimal" />
          </div>
          <Input label="Annual rate" suffix="%" placeholder="8" value={form.rateBps} onChange={set('rateBps')} type="number" min="0" inputMode="decimal" />
          <Input label="Duration" suffix="months" placeholder="6" value={form.durationMonths} onChange={set('durationMonths')} type="number" min="1" max="24" inputMode="numeric" hint="1 to 24" />
        </div>
        {isValid && (
          <div className="flex items-center justify-between text-xs mb-3 px-1">
            <span style={{ color: 'var(--subtle)' }}>Est. RLTV <span className="opacity-70">(max {maxPct}%)</span></span>
            <span className="font-semibold tabular-nums" style={{ color: !hasPrice ? 'var(--subtle)' : ltvTooHigh ? 'var(--danger)' : rltv > maxPct - 5 ? '#f7931a' : '#10b981' }}>
              {hasPrice ? `${rltv.toFixed(1)}%` : 'BTC price unavailable'}
            </span>
          </div>
        )}
        {offerToLend && (
          <p className="text-[11px] mb-3 p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd9a0' }}>
            Binding offer: if the creator accepts it, the borrower can activate the loan right away. If your wallet has
            already approved enough USDC for Persat, it is sent without another signature. The collateral is valued at the
            BTC/USD price; a loss of cirBTC's 1:1 link to BTC during the loan would not be detected.
          </p>
        )}
        {ltvTooHigh && (
          <p className="text-xs mb-3 p-2 rounded-lg" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
            Above {maxPct}%: this loan could not be activated at the current BTC price. Add collateral or lower the amount.
          </p>
        )}
        {!address ? (
          <Button variant="primary" size="md" className="w-full" onClick={() => openConnect(true)}>
            Connect wallet to send an offer
          </Button>
        ) : isWrongChain ? (
          <div className="rounded-xl p-2 text-sm text-center mb-3" style={{ color: 'var(--danger)' }}>Switch to Arc Mainnet</div>
        ) : (
          <Button variant="primary" size="md" className="w-full"
            disabled={!isValid || ltvTooHigh || isPending || isConfirming || isSuccess} onClick={submit}>
            {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : isSuccess ? 'Offer sent' : asPosted ? 'Offer these terms' : 'Send counter-offer'}
          </Button>
        )}
        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={false}
          error={error ? parseOnchainError(error) : simError ?? (reverted ? 'Transaction failed on-chain. The offer was not submitted.' : null)}
          explorerUrl={hash ? `${chain.blockExplorers.default.url}/tx/${hash}` : undefined} />
      </Card>
    </div>
  )
}

function OrderCard({ order, autoOpen = false }: { order: OpenOrder; autoOpen?: boolean }) {
  const { address, addresses, chainId } = useArcNetwork()
  const [showModal, setShowModal] = useState(autoOpen)
  const borrowRequest = isBorrowRequest(order)

  const { data: offers, refetch: refetchOffers } = useReadContract({
    address: addresses.registry, abi: REGISTRY_ABI,
    functionName: 'getActiveCounterOffers', args: [order.dealId], chainId,
  })

  // F-09: a proposer can withdraw their own counter-offer while the order is open
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract()
  const { isSuccess: withdrawDone } = useWaitForTransactionReceipt({
    hash: withdrawHash, chainId, query: { enabled: Boolean(withdrawHash) },
  })
  useEffect(() => {
    if (!withdrawDone) return
    toast.success('Offer cancelled.')
    void refetchOffers()
  }, [withdrawDone, refetchOffers])

  function onOfferSent() {
    setShowModal(false)
    toast.success('Offer sent. Follow it in your Dashboard, under My Offers.')
    void refetchOffers()
  }

  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const activeOffers = offers ? offers.filter((o) => o.active && o.expiresAt >= nowSec).length : 0
  const me = address?.toLowerCase()
  const isOwn = !!me && (me === order.borrower.toLowerCase() || me === order.lender.toLowerCase())
  const myOffer = offers?.find((o) => o.active && me && o.proposer.toLowerCase() === me)

  function withdrawOffer(offerId: bigint) {
    writeWithdraw({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'cancelCounterOffer',
      args: [order.dealId, offerId],
      chainId,
      gas: 100_000n,
    })
  }

  return (
    <>
      <Card className="hover:border-[var(--accent)] transition-colors cursor-default flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge className={borrowRequest ? 'bg-orange-900/40 text-orange-300' : 'bg-blue-900/40 text-blue-300'}>
            {borrowRequest ? 'Borrow Request' : 'Lend Offer'}
          </Badge>
          <Badge className="bg-emerald-900/40 text-emerald-300">Open</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {[
            ['Amount', `${usd(order.principal)} USDC`],
            ['Annual rate', formatBps(order.rateBps)],
            ['Duration', `${order.durationMonths} month${order.durationMonths > 1 ? 's' : ''}`],
            ['Collateral', `${btc(order.collateral)} cirBTC`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs" style={{ color: 'var(--subtle)' }}>{k}</dt>
              <dd className="m-0 text-sm font-semibold tabular-nums truncate" style={{ color: 'var(--ink)' }}>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto pt-3 border-t flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
            <span>{activeOffers} counter-offer{activeOffers !== 1 ? 's' : ''}</span>
            <Link to={`/deal/${order.dealId}/manage`} className="flex items-center gap-1 no-underline" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={11} /> Details
            </Link>
          </div>

          {isOwn ? (
            <span className="self-start text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}>
              Your order
            </span>
          ) : (
            myOffer ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: myOffer.expiresAt < nowSec ? 'var(--subtle)' : 'var(--success)' }}>
                  {myOffer.expiresAt < nowSec
                    ? 'Your offer expired'
                    : `Your offer is pending · ${Math.max(1, Math.ceil(Number(myOffer.expiresAt - nowSec) / 86400))} day(s) left`}
                </span>
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 border" style={{ borderColor: 'var(--border)' }} disabled={isWithdrawing} onClick={() => withdrawOffer(myOffer.offerId)}>
                  <X size={12} />
                  {isWithdrawing ? 'Cancelling…' : 'Cancel my offer'}
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5" onClick={() => setShowModal(true)}>
                <Send size={13} />
                Make an offer {borrowRequest ? 'to lend' : 'to borrow'}
              </Button>
            )
          )}
        </div>
      </Card>
      {showModal && (
        <CounterOfferModal order={order} onClose={() => setShowModal(false)} onSubmitted={onOfferSent} />
      )}
    </>
  )
}

export default function Marketplace() {
  const { addresses, isMainnet } = useArcNetwork()
  const arcClient = getArcClient(isMainnet)
  const [filterRole, setFilterRole] = useState<RoleFilter>('all')
  const [searchParams] = useSearchParams()
  const counterFor = searchParams.get('counter')?.toLowerCase()
  const [orders, setOrders] = useState<OpenOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [lastScanned, setLastScanned] = useState<Date | null>(null)
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem('persat_mkt_guide') !== 'closed' } catch { return true }
  })
  const rememberGuide = (open: boolean) => {
    setGuideOpen(open)
    try { localStorage.setItem('persat_mkt_guide', open ? 'open' : 'closed') } catch { /* storage unavailable */ }
  }

  const scanPublicDeals = useCallback(async () => {
    if (!addresses.registry) return
    setIsLoading(true)
    setLoadError(false)
    try {
      const read = (functionName: string, args: unknown[] = []) =>
        arcClient.readContract({ address: addresses.registry, abi: REGISTRY_ABI, functionName, args } as any) as Promise<any>
      const count = (await read('openPublicDealCount')) as bigint
      const pages: Promise<readonly `0x${string}`[]>[] = []
      for (let offset = 0n; offset < count; offset += SCAN_PAGE) pages.push(read('getOpenPublicDeals', [offset, SCAN_PAGE]))
      const all = (await Promise.all(pages)).flat()
      const ids = [...new Set(all.map((id) => normalizeDealId(id).toLowerCase()))] as `0x${string}`[]

      const rows = await Promise.all(ids.map(async (dealId) => {
        try {
          const [deal, expired] = await Promise.all([read('getDeal', [dealId]), read('isExpired', [dealId])])
          if (deal.state !== DealState.Proposed || deal.visibility !== 1 || expired) return null
          return {
            dealId, borrower: deal.borrower, lender: deal.lender, principal: deal.principal,
            collateral: deal.collateral, rateBps: deal.rateBps, durationMonths: Number(deal.durationMonths),
          } as OpenOrder
        } catch {
          return null
        }
      }))
      setOrders(rows.filter((r): r is OpenOrder => r !== null))
      setLastScanned(new Date())
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [arcClient, addresses.registry])

  useEffect(() => { void scanPublicDeals() }, [scanPublicDeals])

  const counts = {
    all: orders.length,
    borrow: orders.filter(isBorrowRequest).length,
    lend: orders.filter((o) => !isBorrowRequest(o)).length,
  }
  const visible = orders.filter((o) =>
    filterRole === 'all' || (filterRole === 'borrow' ? isBorrowRequest(o) : !isBorrowRequest(o)))

  const emptyText =
    filterRole === 'borrow' ? 'No open borrow requests right now.'
    : filterRole === 'lend' ? 'No open lend offers right now.'
    : 'No open orders yet. Be the first to post one.'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Marketplace</h1>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>
            Open lending and borrowing orders on Arc
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="border" style={{ borderColor: 'var(--border)' }} onClick={scanPublicDeals} disabled={isLoading} aria-label="Refresh orders">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Loading…' : 'Refresh'}</span>
          </Button>
          <Link to="/deal/new" className="flex-1 sm:flex-none no-underline">
            <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5">
              <Plus size={13} />
              Post Order
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-xs mb-4 min-h-[1rem]" style={{ color: 'var(--subtle)' }}>
        {loadError
          ? 'Could not load the orders. Check your connection and refresh.'
          : lastScanned
          ? `Updated at ${lastScanned.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : ''}
      </p>

      {/* How it works & rules */}
      <details
        className="group rounded-xl mb-6 text-sm"
        style={{ background: 'rgba(255,138,0,0.06)', border: '1px solid rgba(255,138,0,0.15)' }}
        open={guideOpen}
        onToggle={(e) => rememberGuide((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center justify-between gap-2 p-4 cursor-pointer list-none select-none font-semibold" style={{ color: 'var(--ink)' }}>
          How it works & rules
          <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--subtle)' }} />
        </summary>
        <div className="px-4 pb-4 -mt-1 space-y-3">
          <ul className="space-y-1 text-xs" style={{ color: '#ddc1ae' }}>
            <li>Borrowers post <span className="text-[#ff8a00] font-semibold">borrow requests</span>, lenders post <span className="text-[#ff8a00] font-semibold">lend offers</span>, each with their own terms.</li>
            <li>Interested? Click <strong>Make an offer</strong>: send the posted terms as they are, or propose different ones.</li>
            <li>The creator picks one offer. The deal then appears in both Dashboards, ready to activate.</li>
            <li>To publish your own order, click <strong>Post Order</strong> and choose Borrow USDC or Lend USDC.</li>
          </ul>
          <p className="text-xs font-semibold pt-1" style={{ color: 'var(--ink)' }}>Rules</p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--subtle)' }}>
            <li>When the creator accepts an offer, its terms are locked on-chain. Funds only move when the loan is activated.</li>
            <li>Once an offer is accepted, the other offers on that order can no longer be accepted.</li>
            <li>Each address can have one active offer per order, and can cancel it while the order is open. Orders expire 30 days after posting.</li>
            <li>After the terms are locked, the borrower has 72 hours to activate the loan.</li>
          </ul>
        </div>
      </details>

      {/* Filters */}
      <div className="flex rounded-xl p-1 mb-6 bg-[var(--surface-muted)] sm:p-0 sm:gap-2 sm:bg-transparent sm:rounded-none" role="radiogroup" aria-label="Filter orders">
        {([
          { key: 'all', short: 'All', long: 'All Orders' },
          { key: 'borrow', short: 'Borrow', long: 'Borrow Requests' },
          { key: 'lend', short: 'Lend', long: 'Lend Offers' },
        ] as { key: RoleFilter; short: string; long: string }[]).map(({ key, short, long }) => (
          <button
            key={key}
            role="radio"
            aria-checked={filterRole === key}
            onClick={() => setFilterRole(key)}
            className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border border-transparent sm:flex-none sm:px-3 sm:py-1.5 sm:rounded-full ${
              filterRole === key
                ? 'bg-[var(--surface-strong)] text-[var(--ink)] sm:bg-[var(--accent)] sm:text-[#17120f] sm:border-[var(--accent)]'
                : 'bg-transparent text-[var(--subtle)] sm:border-[var(--border)]'
            }`}
          >
            <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span>
            <span className="ml-1.5 tabular-nums opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {isLoading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Card key={i} className="animate-pulse h-44" />)}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((o) => <OrderCard key={o.dealId} order={o} autoOpen={o.dealId === counterFor} />)}
        </div>
      ) : (
        <Card className="text-center py-14">
          <Filter size={32} className="mx-auto mb-4" style={{ color: 'var(--subtle)' }} />
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--subtle)' }}>{emptyText}</p>
          <Link to="/deal/new" className="no-underline">
            <Button variant="primary" className="inline-flex items-center gap-1.5">
              <Plus size={14} />
              Post an Order
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
