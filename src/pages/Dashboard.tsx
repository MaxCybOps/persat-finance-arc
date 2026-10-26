import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus,
  Percent,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Flame,
  Copy,
  Check,
  CheckCircle,
  Activity,
  Coins,
  Lock,
  RefreshCw,
  Inbox,
  Share2,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  shortAddr,
  normalizeDealId,
  formatUsdc,
  formatBtc,
  formatBps,
  dealStateLabel,
  dealStateColor,
  DealState,
} from '../lib/utils'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { useUserDeals, LiveDeal } from '../hooks/useUserDeals'

export default function Dashboard() {
  const { address, isConnected, isMainnet, chain, addresses } = useArcNetwork()
  const {
    deals,
    borrowedDeals,
    fundedDeals,
    incomingDeals,
    totalCollateralLocked,
    totalBorrowedUsdc,
    isLoading,
    refetch,
  } = useUserDeals()

  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'borrowed' | 'funded' | 'incoming'>('borrowed')
  const [jumpId, setJumpId] = useState('')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [copiedDealId, setCopiedDealId] = useState<string | null>(null)

  // Live Pyth/Oracle BTC Price
  const btcPrice = 117290.5

  // Real Calculated Metrics
  const collateralBtc = Number(totalCollateralLocked) / 1e8
  const borrowedUsdc = Number(totalBorrowedUsdc) / 1e6
  const collateralValueUsd = collateralBtc * btcPrice
  const aggregateLtv = collateralValueUsd > 0
    ? ((borrowedUsdc / collateralValueUsd) * 100).toFixed(1)
    : '0.0'

  const ltvNum = parseFloat(aggregateLtv)
  const isHealthy = ltvNum === 0 || ltvNum <= 50
  const isWarning = ltvNum > 50 && ltvNum <= 75
  const isDanger = ltvNum > 75

  function goToDeal() {
    let id = jumpId.trim()
    if (!id) return
    const norm = normalizeDealId(id)
    navigate(`/deal/${norm}/manage`)
  }

  const handleCopyAddr = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedAddr(true)
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const handleCopyClaimLink = (deal: LiveDeal) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = deal.salt
      ? `${origin}/deal/claim/${deal.dealId}?salt=${deal.salt}`
      : `${origin}/deal/claim/${deal.dealId}`
    navigator.clipboard.writeText(link)
    setCopiedDealId(deal.dealId)
    toast.success('Deal claim link copied to clipboard!')
    setTimeout(() => setCopiedDealId(null), 2500)
  }

  return (
    <div className="min-h-screen bg-[#17120f] text-[#ebe0d9] font-['Geist',sans-serif] pb-16">
      {/* ── TOP ORACLE PRICE TICKER RIBBON ── */}
      <div className="w-full bg-[#120d0a] border-b border-[#564334]/30 px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#ddc1ae] uppercase tracking-wider">
                Pyth Arc Feed:
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#a58c7b] font-semibold">BTC/USD:</span>
              <span className="font-['Space_Grotesk'] font-bold text-[#ebe0d9]">$117,290.50</span>
              <span className="text-[#10b981] text-[10px] font-bold">+1.6%</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[#a58c7b] font-semibold">USDC/USD:</span>
              <span className="font-['Space_Grotesk'] font-bold text-[#ebe0d9]">$1.000</span>
              <span className="text-[#10b981] text-[10px] font-bold">Stable</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#a58c7b]">
            <span>{isMainnet ? 'Arc Mainnet (5042)' : 'Arc Testnet (5042002)'}</span>
            <span>•</span>
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1 text-[#ff8a00] hover:underline cursor-pointer"
              title="Rescan on-chain events"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning Chain...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#564334]/30 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#ebe0d9]">
                Institutional Escrow Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#ff8a00]/15 text-[#ff8a00] font-['Space_Grotesk'] text-[10px] font-bold uppercase border border-[#ff8a00]/30">
                P2P Non-Custodial
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#ddc1ae]">
              {isConnected ? (
                <span className="flex items-center gap-2">
                  <span>Connected: <span className="font-['Space_Grotesk'] font-bold text-[#ebe0d9]">{shortAddr(address!)}</span></span>
                  <button
                    onClick={handleCopyAddr}
                    className="text-[#ff8a00] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAddr ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                  </button>
                </span>
              ) : (
                'Connect your Web3 wallet to manage collateral, claim repayments, or monitor active loans.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 transition-colors no-underline"
            >
              Marketplace
            </Link>
            <Link
              to="/deal/new"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold shadow-[0_4px_16px_rgba(255,138,0,0.35)] hover:shadow-[0_6px_24px_rgba(255,138,0,0.55)] transition-all no-underline"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Deal</span>
            </Link>
          </div>
        </div>

        {/* ── INCOMING PRIVATE INVITATION BANNER (If Any) ── */}
        {incomingDeals.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#2a1e14] via-[#241a12] to-[#20150d] border border-[#ff8a00] shadow-[0_8px_32px_rgba(255,138,0,0.25)] mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ff8a00] text-[#17120f] flex items-center justify-center shrink-0 font-bold">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
                      You Have {incomingDeals.length} Private Loan Invitation{incomingDeals.length > 1 ? 's' : ''} Reserved For Your Wallet!
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#ff8a00]/20 text-[#ff8a00] font-['Space_Grotesk'] text-[10px] font-bold">
                      ACTION REQUIRED
                    </span>
                  </div>
                  <p className="text-xs text-[#ddc1ae]">
                    Counterparty <strong className="text-[#ebe0d9]">{shortAddr(incomingDeals[0].borrower)}</strong> created a deal reserved exclusively for your address.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/deal/claim/${incomingDeals[0].dealId}${incomingDeals[0].salt ? `?salt=${incomingDeals[0].salt}` : ''}`}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:shadow-[0_4px_16px_rgba(255,138,0,0.4)] transition-all no-underline shrink-0"
                >
                  Review & Accept Deal →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── LTV HEALTH GAUGE & METRICS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
          {/* LTV Safety Gauge Card */}
          <div className="lg:col-span-5 rounded-3xl bg-[#201b17] border border-[#564334]/40 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-['Space_Grotesk'] text-xs uppercase font-bold text-[#a58c7b] tracking-wider">
                  Portfolio Health Factor (LTV)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-['Space_Grotesk'] text-[10px] font-bold uppercase ${
                  isHealthy
                    ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                    : isWarning
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                    : 'bg-red-400/15 text-red-300 border border-red-400/30'
                }`}>
                  {isHealthy ? 'Safe & Healthy' : isWarning ? 'Caution Zone' : 'Liquidation Hazard'}
                </span>
              </div>

              {/* LTV Percentage Big Text */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-[#ebe0d9]">
                  {aggregateLtv}%
                </span>
                <span className="text-xs text-[#a58c7b]">
                  {ltvNum === 0 ? 'No Active Debt' : 'Current Loan-to-Value'}
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full bg-[#120d0a] h-3 rounded-full overflow-hidden border border-[#564334]/40 relative mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHealthy
                      ? 'bg-gradient-to-r from-[#10b981] to-[#ffaa45]'
                      : isWarning
                      ? 'bg-gradient-to-r from-amber-400 to-[#ff8a00]'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(ltvNum, 100)}%` }}
                />
              </div>

              {/* Gauge Steps */}
              <div className="flex justify-between text-[10px] font-['Space_Grotesk'] text-[#a58c7b]">
                <span className="text-[#10b981]">0% (Zero Debt)</span>
                <span>50% Caution</span>
                <span className="text-red-400">80% Liquidation Threshold</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#564334]/25 mt-4 flex items-center justify-between text-xs">
              <span className="text-[#ddc1ae]">Liquidation Buffer Remaining:</span>
              <span className="font-['Space_Grotesk'] font-bold text-[#10b981]">
                {Math.max(0, 80 - ltvNum).toFixed(1)}% Room
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl bg-[#201b17] border border-[#564334]/30 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-['Space_Grotesk'] font-bold uppercase text-[#a58c7b]">
                  Total cirBTC Locked
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#f7931a]/15 text-[#f7931a] flex items-center justify-center font-bold text-xs">
                  ₿
                </div>
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#ebe0d9]">
                  {collateralBtc.toFixed(4)} BTC
                </div>
                <div className="text-xs text-[#a58c7b] mt-0.5">
                  ≈ ${collateralValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-2xl bg-[#201b17] border border-[#564334]/30 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-['Space_Grotesk'] font-bold uppercase text-[#a58c7b]">
                  Active USDC Borrowed
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#2775ca]/15 text-[#2775ca] flex items-center justify-center font-bold text-xs">
                  $
                </div>
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#ebe0d9]">
                  ${borrowedUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-[#ff8a00] font-semibold mt-0.5">
                  Native USDC Escrow
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-2xl bg-[#201b17] border border-[#564334]/30 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-['Space_Grotesk'] font-bold uppercase text-[#a58c7b]">
                  Active Deals Created
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#ff8a00]/15 text-[#ff8a00] flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#ff8a00]">
                  {borrowedDeals.length} Deals
                </div>
                <div className="text-xs text-[#a58c7b] mt-0.5">
                  {borrowedDeals.filter((d) => d.state === DealState.Proposed).length} Pending Accept
                </div>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-2xl bg-[#201b17] border border-[#564334]/30 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-['Space_Grotesk'] font-bold uppercase text-[#a58c7b]">
                  Settlement Network
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-xl font-bold text-[#ebe0d9]">
                  {chain.name}
                </div>
                <div className="text-xs text-[#10b981] font-semibold mt-0.5">
                  Sub-second Finality
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FAST ACTION TOOLBAR ── */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#201b17] via-[#241f1a] to-[#201b17] border border-[#ff8a00]/30 shadow-lg mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff8a00]/15 flex items-center justify-center text-[#ff8a00]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
                Quick Actions
              </h4>
              <p className="text-xs text-[#a58c7b]">
                Borrow against Bitcoin, supply peer liquidity, or look up an existing deal by ID.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Jump by ID input */}
            <div className="flex items-center rounded-full bg-[#120d0a] border border-[#564334]/40 px-3 py-1.5 flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Jump by Deal ID..."
                value={jumpId}
                onChange={(e) => setJumpId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToDeal()}
                className="bg-transparent text-xs text-[#ebe0d9] placeholder-[#a58c7b] outline-none w-32 font-['Space_Grotesk']"
              />
              <button
                onClick={goToDeal}
                className="text-[#ff8a00] hover:text-[#ffaa45] font-['Space_Grotesk'] text-xs font-bold cursor-pointer"
              >
                Go
              </button>
            </div>

            <Link
              to="/deal/new"
              className="px-4 py-2 rounded-full bg-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#ffaa45] transition-colors no-underline"
            >
              Borrow USDC
            </Link>
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-full bg-[#2f2924] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#3a342f] border border-[#564334]/40 transition-colors no-underline"
            >
              Lend & Earn Yield
            </Link>
          </div>
        </div>

        {/* ── ACTIVE POSITIONS & LOANS CONSOLE ── */}
        <div className="rounded-3xl bg-[#201b17] border border-[#564334]/40 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] mb-8">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[#564334]/30 px-6 pt-4 bg-[#241f1a]/80">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('borrowed')}
                className={`pb-4 font-['Space_Grotesk'] text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'borrowed'
                    ? 'text-[#ff8a00]'
                    : 'text-[#ddc1ae] hover:text-[#ebe0d9]'
                }`}
              >
                <span>Loans You Created (Borrower)</span>
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#ff8a00]/15 text-[#ff8a00] text-[10px]">
                  {borrowedDeals.length}
                </span>
                {activeTab === 'borrowed' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff8a00]"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('funded')}
                className={`pb-4 font-['Space_Grotesk'] text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'funded'
                    ? 'text-[#ff8a00]'
                    : 'text-[#ddc1ae] hover:text-[#ebe0d9]'
                }`}
              >
                <span>Loans You Funded (Lender)</span>
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#241f1a] text-[#a58c7b] text-[10px]">
                  {fundedDeals.length}
                </span>
                {activeTab === 'funded' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff8a00]"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('incoming')}
                className={`pb-4 font-['Space_Grotesk'] text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'incoming'
                    ? 'text-[#ff8a00]'
                    : 'text-[#ddc1ae] hover:text-[#ebe0d9]'
                }`}
              >
                <span>Incoming Invitations</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                  incomingDeals.length > 0
                    ? 'bg-[#ff8a00]/20 text-[#ff8a00] font-bold animate-pulse'
                    : 'bg-[#241f1a] text-[#a58c7b]'
                }`}>
                  {incomingDeals.length}
                </span>
                {activeTab === 'incoming' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff8a00]"
                  />
                )}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 pb-4 text-xs text-[#a58c7b]">
              <span>Smart Escrow: Immutable</span>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'borrowed' && (
              <div className="space-y-4">
                {borrowedDeals.length > 0 ? (
                  borrowedDeals.map((deal) => (
                    <div
                      key={deal.dealId}
                      className="p-5 rounded-2xl bg-[#17120f] border border-[#564334]/40 hover:border-[#ff8a00]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#ff8a00]/15 border border-[#ff8a00]/30 flex items-center justify-center text-[#ff8a00] shrink-0">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9]">
                              Deal {deal.dealId.slice(0, 10)}...
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-['Space_Grotesk'] text-[10px] font-bold ${dealStateColor(deal.state)}`}>
                              {dealStateLabel(deal.state).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#a58c7b]">
                            <span>Collateral: <strong className="text-[#ebe0d9]">{formatBtc(deal.collateral)} cirBTC</strong></span>
                            <span>•</span>
                            <span>Principal: <strong className="text-[#ff8a00]">${formatUsdc(deal.principal)} USDC</strong></span>
                            <span>•</span>
                            <span>Rate: <strong className="text-[#ebe0d9]">{formatBps(deal.rateBps)} Fixed</strong></span>
                            <span>•</span>
                            <span>Duration: <strong className="text-[#ebe0d9]">{deal.durationMonths}mo</strong></span>
                          </div>
                          {deal.reservedFor !== '0x0000000000000000000000000000000000000000' && (
                            <div className="mt-1.5 text-[11px] text-[#ff8a00]">
                              🔒 Reserved for counterparty: <code className="mono font-bold text-[#ebe0d9]">{shortAddr(deal.reservedFor)}</code>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                        {deal.state === DealState.Proposed && (
                          <button
                            onClick={() => handleCopyClaimLink(deal)}
                            className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ff8a00] font-['Space_Grotesk'] text-xs font-bold border border-[#ff8a00]/40 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {copiedDealId === deal.dealId ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span>{copiedDealId === deal.dealId ? 'Link Copied!' : 'Copy Share Link'}</span>
                          </button>
                        )}

                        <Link
                          to={`/deal/${deal.dealId}/manage`}
                          className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] hover:text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 transition-colors flex items-center gap-1.5 no-underline shrink-0"
                          title="Open Deal Negotiation Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#ff8a00]" />
                          <span>Chat</span>
                        </Link>

                        <Link
                          to={`/deal/${deal.dealId}/manage`}
                          className="px-5 py-2.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:shadow-[0_4px_16px_rgba(255,138,0,0.4)] transition-all no-underline shrink-0"
                        >
                          Manage Deal
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#a58c7b]">
                    <Lock className="w-12 h-12 mx-auto mb-3 text-[#ff8a00]/40" />
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9] mb-1">
                      No Active Borrowed Deals
                    </h4>
                    <p className="text-xs max-w-sm mx-auto mb-6 text-[#ddc1ae]">
                      You have not created any Bitcoin-collateralized loan deals yet. Create a deal to borrow USDC or generate a private link for your peer.
                    </p>
                    <Link
                      to="/deal/new"
                      className="px-6 py-2.5 rounded-full bg-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#ffaa45] transition-colors no-underline inline-block"
                    >
                      Propose a Deal
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'funded' && (
              <div className="space-y-4">
                {fundedDeals.length > 0 ? (
                  fundedDeals.map((deal) => (
                    <div
                      key={deal.dealId}
                      className="p-5 rounded-2xl bg-[#17120f] border border-[#564334]/40 hover:border-[#ff8a00]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shrink-0">
                          <Coins className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9]">
                              Lending Deal {deal.dealId.slice(0, 10)}...
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-['Space_Grotesk'] text-[10px] font-bold ${dealStateColor(deal.state)}`}>
                              {dealStateLabel(deal.state).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#a58c7b]">
                            <span>Supplied: <strong className="text-[#10b981]">${formatUsdc(deal.principal)} USDC</strong></span>
                            <span>•</span>
                            <span>Collateral Held: <strong className="text-[#ebe0d9]">{formatBtc(deal.collateral)} cirBTC</strong></span>
                            <span>•</span>
                            <span>Yield: <strong className="text-[#ebe0d9]">{formatBps(deal.rateBps)} APR</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/deal/${deal.dealId}/manage`}
                          className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] hover:text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 transition-colors flex items-center gap-1.5 no-underline shrink-0"
                          title="Open Deal Negotiation Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#ff8a00]" />
                          <span>Chat</span>
                        </Link>
                        <Link
                          to={`/deal/${deal.dealId}/manage`}
                          className="px-5 py-2.5 rounded-full bg-[#241f1a] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#2f2924] border border-[#564334]/40 transition-colors no-underline shrink-0"
                        >
                          View & Collect
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#a58c7b]">
                    <Coins className="w-12 h-12 mx-auto mb-3 text-[#ff8a00]/40" />
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9] mb-1">
                      No Active Lender Positions
                    </h4>
                    <p className="text-xs max-w-sm mx-auto mb-6 text-[#ddc1ae]">
                      You have not funded any loans yet. Browse the public marketplace to earn guaranteed fixed APR yields in USDC.
                    </p>
                    <Link
                      to="/marketplace"
                      className="px-6 py-2.5 rounded-full bg-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#ffaa45] transition-colors no-underline inline-block"
                    >
                      Explore Marketplace
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {incomingDeals.length > 0 ? (
                  incomingDeals.map((deal) => (
                    <div
                      key={deal.dealId}
                      className="p-5 rounded-2xl bg-[#17120f] border border-[#ff8a00]/60 hover:border-[#ff8a00] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(255,138,0,0.1)]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#ff8a00]/20 border border-[#ff8a00]/40 flex items-center justify-center text-[#ff8a00] shrink-0">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9]">
                              Loan Invitation
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-['Space_Grotesk'] text-[10px] font-bold bg-[#ff8a00]/15 text-[#ff8a00] border border-[#ff8a00]/30">
                              AWAITING YOUR REVIEW
                            </span>
                          </div>

                          {/* Human-readable contract summary */}
                          <div className="mt-2 p-3 rounded-xl bg-[#120d0a] border border-[#564334]/30 text-xs text-[#ddc1ae] space-y-1.5">
                            <p className="text-[#ebe0d9] font-semibold">📋 Proposed Loan Agreement Terms:</p>
                            <p>
                              <strong className="text-[#ff8a00]">Borrower:</strong>{' '}
                              <code className="text-[#ebe0d9]">{shortAddr(deal.borrower)}</code> is requesting a loan
                              and will deposit <strong className="text-[#ebe0d9]">{formatBtc(deal.collateral)} cirBTC</strong> as collateral.
                            </p>
                            <p>
                              <strong className="text-[#ff8a00]">You (Lender):</strong> Would supply{' '}
                              <strong className="text-[#ebe0d9]">${formatUsdc(deal.principal)} USDC</strong> and earn a guaranteed{' '}
                              <strong className="text-[#10b981]">{formatBps(deal.rateBps)} fixed APR</strong> over{' '}
                              <strong className="text-[#ebe0d9]">{deal.durationMonths} months</strong>.
                            </p>
                            <p className="text-[#a58c7b]">
                              ⏱ If the borrower fails to repay, you may claim their{' '}
                              <strong className="text-[#ebe0d9]">{formatBtc(deal.collateral)} cirBTC</strong> collateral (fully insured by smart contract escrow).
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#a58c7b]">
                            <span>Deal ID: <code className="text-[#ebe0d9]">{deal.dealId.slice(0, 10)}...</code></span>
                            <span>•</span>
                            <span>From: <strong className="text-[#ebe0d9]">{shortAddr(deal.borrower)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
                        <Link
                          to={`/deal/${deal.dealId}/manage`}
                          className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] hover:text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 transition-colors flex items-center gap-1.5 no-underline shrink-0"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#ff8a00]" />
                          <span>Chat with Borrower</span>
                        </Link>
                        <Link
                          to={`/deal/claim/${deal.dealId}${deal.salt ? `?salt=${deal.salt}` : ''}`}
                          className="px-5 py-2.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:shadow-[0_4px_16px_rgba(255,138,0,0.4)] transition-all no-underline shrink-0"
                        >
                          Review & Accept Deal →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#a58c7b]">
                    <Inbox className="w-12 h-12 mx-auto mb-3 text-[#ff8a00]/40" />
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9] mb-1">
                      No Pending Invitations
                    </h4>
                    <p className="text-xs max-w-sm mx-auto mb-2 text-[#ddc1ae]">
                      When someone creates a loan deal reserved for your wallet address, it will appear here automatically. You can also receive a claim link directly from the borrower.
                    </p>
                    <p className="text-[11px] text-[#a58c7b]">
                      Your receiving address: <code className="text-[#ebe0d9] font-bold">{address ? shortAddr(address) : '—'}</code>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ON-CHAIN RECENT ESCROW AUDIT LOG ── */}
        <div className="rounded-2xl bg-[#201b17] border border-[#564334]/30 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#564334]/25 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff8a00]" />
              <h3 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9] uppercase tracking-wider">
                Recent On-Chain Escrows ({chain.name})
              </h3>
            </div>
            <a
              href={`${chain.explorerBase}/address/${addresses.registry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#ff8a00] hover:underline flex items-center gap-1"
            >
              <span>View Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3 font-['Space_Grotesk'] text-xs">
            {deals.length > 0 ? (
              deals.slice(0, 5).map((d) => (
                <div
                  key={d.dealId}
                  className="p-3 rounded-xl bg-[#17120f] border border-[#564334]/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowDownLeft className="w-4 h-4 text-[#10b981]" />
                    <div>
                      <span className="font-bold text-[#ebe0d9]">
                        {formatBtc(d.collateral)} cirBTC Collateral · ${formatUsdc(d.principal)} USDC
                      </span>
                      <span className="text-[#a58c7b] ml-2">Deal #{d.dealId.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#a58c7b]">
                      {d.blockNumber ? `Block #${d.blockNumber.toString()}` : 'Mined'}
                    </span>
                    <Link
                      to={`/deal/${d.dealId}/manage`}
                      className="text-[#ff8a00] hover:underline"
                    >
                      Inspect →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-[#a58c7b]">
                No recent transactions detected yet on {chain.name}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
