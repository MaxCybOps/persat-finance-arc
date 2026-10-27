// oxlint-disable
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { Filter, Plus, X, RefreshCw, ExternalLink } from 'lucide-react'
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
  normalizeDealId,
} from '../lib/utils'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'

interface OfferForm {
  principal: string
  collateral: string
  rateBps: string
  durationMonths: string
}

function CounterOfferModal({ dealId, onClose }: { dealId: `0x${string}`; onClose: () => void }) {
  const { isWrongChain, addresses, chainId, chain } = useArcNetwork()
  const [form, setForm] = useState<OfferForm>({ principal: '', collateral: '', rateBps: '', durationMonths: '' })
  const set = (k: keyof OfferForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId, query: { enabled: Boolean(hash) } })

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
      gas: 200_000n,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Submit Counter-Offer</h3>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--subtle)' }} /></button>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-xs"
          style={{ background: 'rgba(255,138,0,0.08)', border: '1px solid rgba(255,138,0,0.2)', color: '#ddc1ae' }}>
          <Filter size={12} className="flex-shrink-0 mt-0.5 text-[#ff8a00]" />
          Propose your preferred terms. The deal creator reviews and accepts the best offer.
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="Principal (USDC)" placeholder="1000" value={form.principal} onChange={set('principal')} type="number" />
          <Input label="Collateral (cirBTC)" placeholder="0.03" value={form.collateral} onChange={set('collateral')} type="number" />
          <Input label="Annual Rate (%)" placeholder="8" value={form.rateBps} onChange={set('rateBps')} type="number" />
          <Input label="Duration (months)" placeholder="6" value={form.durationMonths} onChange={set('durationMonths')} type="number" />
        </div>
        {isWrongChain ? (
          <div className="rounded-xl p-2 text-sm text-center mb-3" style={{ color: 'var(--danger)' }}>Switch to Arc Testnet</div>
        ) : (
          <Button variant="primary" size="md" className="w-full"
            disabled={!isValid || isPending || isConfirming || isSuccess} onClick={submit}>
            {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Submit Offer'}
          </Button>
        )}
        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess}
          error={error ? parseOnchainError(error) : null}
          explorerUrl={hash ? `${chain.explorerBase}/tx/${hash}` : undefined} />
        {isSuccess && (
          <p className="text-xs text-center mt-2" style={{ color: 'var(--success)' }}>
            Offer submitted. The deal creator will see it on their Dashboard.
          </p>
        )}
      </Card>
    </div>
  )
}

function OrderCard({ dealId }: { dealId: `0x${string}` }) {
  const { address, addresses, chainId } = useArcNetwork()
  const [showModal, setShowModal] = useState(false)

  const { data: deal } = useReadContract({
    address: addresses.registry, abi: REGISTRY_ABI,
    functionName: 'getDeal', args: [dealId], chainId,
  })
  const { data: offers } = useReadContract({
    address: addresses.registry, abi: REGISTRY_ABI,
    functionName: 'getCounterOffers', args: [dealId], chainId,
  })

  // Only show Public (visibility=1) deals in Proposed state
  if (!deal || deal.state !== DealState.Proposed || deal.visibility !== 1) return null

  const activeOffers = offers ? offers.filter((o) => o.active).length : 0
  const isOwn = address?.toLowerCase() === deal.borrower.toLowerCase() ||
    address?.toLowerCase() === deal.lender.toLowerCase()
  const isBorrowRequest = deal.borrower !== '0x0000000000000000000000000000000000000000'

  return (
    <>
      <Card className="hover:border-[var(--accent)] transition-colors cursor-default">
        <div className="flex items-start justify-between mb-3">
          <Badge className={isBorrowRequest ? 'bg-orange-900/40 text-orange-300' : 'bg-blue-900/40 text-blue-300'}>
            {isBorrowRequest ? 'Borrow Request' : 'Lend Offer'}
          </Badge>
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

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              {activeOffers} offer{activeOffers !== 1 ? 's' : ''}
            </p>
            <Link
              to={`/deal/${dealId}/manage`}
              className="text-xs flex items-center gap-1 no-underline"
              style={{ color: 'var(--accent)' }}
            >
              <ExternalLink size={10} />
              View
            </Link>
          </div>
          {!isOwn && (
            <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={12} />
              Offer Terms
            </Button>
          )}
          {isOwn && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}>
              Your post
            </span>
          )}
        </div>
      </Card>
      {showModal && <CounterOfferModal dealId={dealId} onClose={() => setShowModal(false)} />}
    </>
  )
}

export default function Marketplace() {
  const { addresses, chainId, isMainnet } = useArcNetwork()
  const publicClient = usePublicClient({ chainId })
  const [filterRole, setFilterRole] = useState<'all' | 'borrow' | 'lend'>('all')
  const [dealIds, setDealIds] = useState<`0x${string}`[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<number | null>(null)

  const scanPublicDeals = useCallback(async () => {
    if (!publicClient || !addresses.registry) return
    setIsLoading(true)
    try {
      const latestBlock = await publicClient.getBlockNumber()
      const deploymentBlock = isMainnet ? 27635000n : 68660000n
      // Only scan last 12 hours to avoid rate limits — public deals are recent
      const fromBlock = latestBlock - 43200n > deploymentBlock
        ? latestBlock - 43200n
        : deploymentBlock

      const ids = new Set<string>()
      let toBlock = latestBlock
      let chunks = 0
      const CHUNK = 4500n
      const MAX_CHUNKS = 10

      while (toBlock > fromBlock && chunks < MAX_CHUNKS) {
        const chunkFrom = toBlock - CHUNK + 1n < fromBlock ? fromBlock : toBlock - CHUNK + 1n
        try {
          const logs = await publicClient.getLogs({
            address: addresses.registry,
            event: parseAbiItem('event DealProposed(bytes16 indexed dealId, address indexed proposer, uint8 visibility)'),
            fromBlock: chunkFrom,
            toBlock,
          })
          for (const log of logs) {
            if (log.args?.dealId) ids.add(normalizeDealId(log.args.dealId).toLowerCase())
          }
        } catch { /* rate limit — stop */ break }
        toBlock = chunkFrom - 1n
        chunks++
        await new Promise((r) => setTimeout(r, 300))
      }

      setDealIds(Array.from(ids) as `0x${string}`[])
      setLastScanned(Date.now())
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [publicClient, addresses.registry, chainId, isMainnet])

  useEffect(() => { void scanPublicDeals() }, [scanPublicDeals])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Marketplace</h1>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>
            Open lending and borrowing requests on Arc {isMainnet ? 'Mainnet' : 'Testnet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={scanPublicDeals} disabled={isLoading}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Scanning…' : 'Refresh'}
          </Button>
          <Link to="/deal/new">
            <Button variant="primary" size="sm">
              <Plus size={13} />
              Post Order
            </Button>
          </Link>
        </div>
      </div>

      {lastScanned && (
        <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
          Last scanned {Math.round((Date.now() - lastScanned) / 1000)}s ago
        </p>
      )}

      {/* How it works for lenders */}
      <div className="rounded-xl p-4 mb-6 text-sm"
        style={{ background: 'rgba(255,138,0,0.06)', border: '1px solid rgba(255,138,0,0.15)' }}>
        <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>How the Marketplace works</p>
        <ul className="space-y-1 text-xs" style={{ color: '#ddc1ae' }}>
          <li><span className="text-[#ff8a00] font-semibold">Borrowers</span> post a request with their terms (amount, rate, duration, collateral).</li>
          <li><span className="text-[#ff8a00] font-semibold">Lenders</span> browse open requests and click <strong>Offer Terms</strong> to propose different terms.</li>
          <li>The borrower reviews all offers on their Dashboard and accepts the best one.</li>
          <li>Want to lend? Click <strong>Post Order</strong>, choose "I am the Lender", and set your terms.</li>
        </ul>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'borrow', label: 'Borrow Requests' },
          { key: 'lend', label: 'Lend Offers' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilterRole(key as typeof filterRole)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
            style={{
              background: filterRole === key ? 'var(--accent)' : 'transparent',
              color: filterRole === key ? '#17120f' : 'var(--subtle)',
              borderColor: filterRole === key ? 'var(--accent)' : 'var(--border)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {isLoading && dealIds.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Card key={i} className="animate-pulse h-36" />)}
        </div>
      ) : dealIds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dealIds.map((id) => <OrderCard key={id} dealId={id} />)}
        </div>
      ) : (
        <Card className="text-center py-16">
          <Filter size={32} className="mx-auto mb-4" style={{ color: 'var(--subtle)' }} />
          <h2 className="display text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>No open orders yet</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--subtle)' }}>
            Be the first to post a public lending or borrowing request. Anyone with Arc Testnet USDC can submit an offer.
          </p>
          <Link to="/deal/new">
            <Button variant="primary">
              <Plus size={14} />
              Post an Order
            </Button>
          </Link>
        </Card>
      )}

      {/* Protocol rules */}
      <Card className="mt-6">
        <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--ink)' }}>Marketplace Rules</h3>
        <ul className="text-xs space-y-1" style={{ color: 'var(--subtle)' }}>
          <li>Counter-offers let you propose your preferred terms: principal, rate, duration, and collateral.</li>
          <li>Both parties negotiate until the deal creator accepts — all terms are locked on-chain.</li>
          <li>When one offer is accepted, all others are cancelled atomically by the smart contract.</li>
          <li>An accepted offer binds both parties with an immutable on-chain hash.</li>
        </ul>
      </Card>
    </div>
  )
}
