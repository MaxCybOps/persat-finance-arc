import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Filter, Plus, X } from 'lucide-react'
import { Card, Button, Badge, Input, TxStatus } from '../components/ui'
import {
  dealStateLabel,
  dealStateColor,
  formatUsdc,
  formatBtc,
  formatBps,
  parseUsdc,
  parseBtc,
  shortAddr,
  DealState,
  parseOnchainError,
} from '../lib/utils'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'

// Type for counter-offer form
interface OfferForm {
  principal: string
  collateral: string
  rateBps: string
  durationMonths: string
}

function CounterOfferModal({
  dealId,
  onClose,
}: {
  dealId: `0x${string}`
  onClose: () => void
}) {
  const { isWrongChain, addresses, chainId, chain } = useArcNetwork()
  const [form, setForm] = useState<OfferForm>({ principal: '', collateral: '', rateBps: '', durationMonths: '' })
  const set = (k: keyof OfferForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: {
      enabled: Boolean(hash),
    },
  })

  const principalRaw = parseUsdc(form.principal)
  const collateralRaw = parseBtc(form.collateral)
  const rateBpsRaw = BigInt(Math.round(parseFloat(form.rateBps || '0') * 100))
  const duration = parseInt(form.durationMonths || '0')
  const isValid = principalRaw > 0n && collateralRaw > 0n && rateBpsRaw > 0n && duration > 0

  function submit() {
    if (!isValid) return
    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'submitCounterOffer',
      args: [dealId, principalRaw, collateralRaw, rateBpsRaw, duration],
      chainId,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Submit Counter-Offer
          </h3>
          <button onClick={onClose}>
            <X size={16} style={{ color: 'var(--subtle)' }} />
          </button>
        </div>

        <div
          className="flex items-start gap-2 p-3 rounded-xl mb-4 text-xs"
          style={{ background: 'rgba(172,198,233,0.1)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <Filter size={12} className="flex-shrink-0 mt-0.5" />
          Structured numbers only. Amount, rate, duration, and collateral — no free-text messaging.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="Principal (USDC)" placeholder="1000" value={form.principal} onChange={set('principal')} type="number" />
          <Input label="Collateral (cirBTC)" placeholder="0.03" value={form.collateral} onChange={set('collateral')} type="number" />
          <Input label="Annual Rate (%)" placeholder="8" value={form.rateBps} onChange={set('rateBps')} type="number" />
          <Input label="Duration (months)" placeholder="6" value={form.durationMonths} onChange={set('durationMonths')} type="number" />
        </div>

        {isWrongChain ? (
          <div className="rounded-xl p-2 text-sm text-center mb-3" style={{ color: 'var(--danger)' }}>
            Switch to Arc Testnet
          </div>
        ) : (
          <Button
            variant="primary"
            size="md"
            className="w-full"
            disabled={!isValid || isPending || isConfirming || isSuccess}
            onClick={submit}
          >
            {isPending ? 'Confirm...' : isConfirming ? 'Confirming...' : 'Submit Offer'}
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
          <p className="text-xs text-center mt-2" style={{ color: 'var(--success)' }}>
            Offer submitted! The deal proposer will see it on-chain.
          </p>
        )}
      </Card>
    </div>
  )
}

// A single marketplace order card — reads live from the chain
function OrderCard({ dealId }: { dealId: `0x${string}` }) {
  const { address, addresses, chainId } = useArcNetwork()
  const [showModal, setShowModal] = useState(false)

  const { data: deal } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'getDeal',
    args: [dealId],
    chainId,
  })

  const { data: offers } = useReadContract({
    address: addresses.registry,
    abi: REGISTRY_ABI,
    functionName: 'getCounterOffers',
    args: [dealId],
    chainId,
  })

  if (!deal || deal.state !== DealState.Proposed || deal.visibility !== 1) return null
  const activeOffers = offers ? offers.filter((o) => o.active).length : 0
  const isOwn = address?.toLowerCase() === deal.borrower.toLowerCase() ||
    address?.toLowerCase() === deal.lender.toLowerCase()

  return (
    <>
      <Card className="hover:border-[var(--accent)] transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge
              className={
                deal.borrower !== '0x0000000000000000000000000000000000000000'
                  ? 'bg-orange-900/40 text-orange-300'
                  : 'bg-blue-900/40 text-blue-300'
              }
            >
              {deal.borrower !== '0x0000000000000000000000000000000000000000' ? 'Borrow Request' : 'Lend Offer'}
            </Badge>
          </div>
          <Badge className={dealStateColor(deal.state)}>{dealStateLabel(deal.state)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
          {[
            ['Principal', `$${formatUsdc(deal.principal)}`],
            ['Rate', formatBps(deal.rateBps)],
            ['Duration', `${deal.durationMonths}mo`],
            ['Collateral', `${formatBtc(deal.collateral)} BTC`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: 'var(--subtle)' }}>{k}</span>
              <span className="font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            {activeOffers} offer{activeOffers !== 1 ? 's' : ''} ·{' '}
            <span className="mono">{shortAddr(dealId)}</span>
          </p>
          {!isOwn && (
            <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={12} />
              Counter
            </Button>
          )}
        </div>
      </Card>

      {showModal && <CounterOfferModal dealId={dealId} onClose={() => setShowModal(false)} />}
    </>
  )
}

export default function Marketplace() {
  const [filterRole, setFilterRole] = useState<'all' | 'borrow' | 'lend'>('all')

  // In production, deal IDs would come from event indexing.
  // For now we show an empty state with instructions.
  const sampleDealIds: `0x${string}`[] = []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Marketplace
          </h1>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>
            Open lending and borrowing requests on Arc Testnet
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'borrow', label: 'Borrow Requests' },
          { key: 'lend', label: 'Lend Offers' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterRole(key as typeof filterRole)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
            style={{
              background: filterRole === key ? 'var(--accent)' : 'transparent',
              color: filterRole === key ? '#0d1b2f' : 'var(--subtle)',
              borderColor: filterRole === key ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {sampleDealIds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleDealIds.map((id) => (
            <OrderCard key={id} dealId={id} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <Filter size={32} className="mx-auto mb-4" style={{ color: 'var(--subtle)' }} />
          <h2 className="display text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>
            No open orders yet
          </h2>
          <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: 'var(--subtle)' }}>
            Be the first to post a lending or borrowing request. Counter-offers use structured numbers only — no free-text messaging.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.assign('/deal/new')}
          >
            <Plus size={14} />
            Post an Order
          </Button>
          <p className="text-xs mt-4" style={{ color: 'var(--subtle)' }}>
            Event indexing for live order discovery is coming soon.
            Known deal IDs can be managed directly at{' '}
            <code className="mono">/deal/[id]/manage</code>.
          </p>
        </Card>
      )}

      {/* Protocol rules */}
      <Card className="mt-6">
        <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--ink)' }}>
          Marketplace Rules
        </h3>
        <ul className="text-xs space-y-1" style={{ color: 'var(--subtle)' }}>
          <li>Counter-offers are structured: amount, rate, duration, and collateral only.</li>
          <li>No free-text messaging between unmatched parties — prevents phishing.</li>
          <li>The original proposer accepts a counter-offer; all others are cancelled atomically.</li>
          <li>An accepted offer binds both parties and locks terms with an on-chain hash.</li>
        </ul>
      </Card>
    </div>
  )
}
