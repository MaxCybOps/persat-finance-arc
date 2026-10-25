import React, { useState, useEffect } from 'react'
import { MessageSquare, X, ChevronUp, ChevronDown, Sparkles, ExternalLink } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { DealChat } from './DealChat'
import { getStoredDeals, StoredDeal } from '../lib/dealStorage'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { normalizeDealId, isValidDealId, shortAddr } from '../lib/utils'

export function FloatingChatDrawer() {
  const { pathname } = useLocation()
  const { address, chainId } = useArcNetwork()

  const [isOpen, setIsOpen] = useState(false)
  const [deals, setDeals] = useState<StoredDeal[]>([])
  const [activeDealId, setActiveDealId] = useState<string>('')
  const [customDealInput, setCustomDealInput] = useState('')

  // Load recent deals
  useEffect(() => {
    const list = getStoredDeals(chainId)
    setDeals(list)
    if (list.length > 0 && !activeDealId) {
      setActiveDealId(list[0].dealId)
    }
  }, [chainId, isOpen, activeDealId])

  // Detect if user is currently visiting a deal page
  useEffect(() => {
    const claimMatch = pathname.match(/\/deal\/claim\/([a-zA-Z0-9xX]+)/)
    const manageMatch = pathname.match(/\/deal\/([a-zA-Z0-9xX]+)\/manage/) || pathname.match(/\/deal\/manage\/([a-zA-Z0-9xX]+)/)
    const urlDealId = claimMatch?.[1] || manageMatch?.[1]

    if (urlDealId && isValidDealId(urlDealId)) {
      const norm = normalizeDealId(urlDealId)
      setActiveDealId(norm)
    }
  }, [pathname])

  const selectedDeal = deals.find((d) => d.dealId.toLowerCase() === activeDealId.toLowerCase())

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] max-h-[85vh] h-[580px] bg-[#1a1512] border border-[#ff8a00]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#140f0c] border-b border-[#564334]/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#ff8a00]/15 text-[#ff8a00] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9] leading-tight">
                  P2P Deal Negotiation Chat
                </h3>
                <span className="text-[10px] text-[#10b981] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  Live Sync Active
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-[#a58c7b] hover:text-[#ebe0d9] hover:bg-[#241f1a] rounded-lg transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Deal Selector Bar */}
          <div className="p-3 bg-[#1f1915] border-b border-[#564334]/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#a58c7b]">
              <span>Select Deal Negotiation:</span>
              {activeDealId && (
                <Link
                  to={`/deal/${activeDealId}/manage`}
                  className="text-[#ff8a00] hover:underline flex items-center gap-1 font-['Space_Grotesk']"
                >
                  <span>Open Escrow</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {deals.length > 0 ? (
              <select
                value={activeDealId}
                onChange={(e) => setActiveDealId(e.target.value)}
                className="w-full text-xs font-mono bg-[#140f0c] border border-[#564334]/50 rounded-lg px-2.5 py-1.5 text-[#ebe0d9] outline-none focus:border-[#ff8a00]"
              >
                {deals.map((d) => (
                  <option key={d.dealId} value={d.dealId}>
                    Deal #{d.dealId.slice(0, 10)}... · {d.principal} USDC ({d.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Paste Deal ID (0x...)"
                  value={customDealInput}
                  onChange={(e) => setCustomDealInput(e.target.value)}
                  className="flex-1 text-xs font-mono bg-[#140f0c] border border-[#564334]/50 rounded-lg px-2.5 py-1.5 text-[#ebe0d9] outline-none focus:border-[#ff8a00]"
                />
                <button
                  onClick={() => {
                    if (isValidDealId(customDealInput.trim())) {
                      setActiveDealId(normalizeDealId(customDealInput.trim()))
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 bg-[#ff8a00] hover:bg-[#ffaa45] text-[#17120f] font-['Space_Grotesk'] font-bold rounded-lg cursor-pointer"
                >
                  Join
                </button>
              </div>
            )}
          </div>

          {/* Active Chat Component */}
          <div className="flex-1 overflow-hidden p-3 bg-[#17120f]">
            {activeDealId && isValidDealId(activeDealId) ? (
              <DealChat
                dealId={normalizeDealId(activeDealId)}
                borrower={selectedDeal?.role === 'borrower' ? (address || '') : ''}
                lender={selectedDeal?.role === 'lender' ? (address || '') : ''}
                currentAddress={address}
                dealStateLabel="Active Negotiation"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#a58c7b]">
                <Sparkles className="w-8 h-8 text-[#ff8a00] mb-2 opacity-60" />
                <p className="font-['Space_Grotesk'] text-sm text-[#ebe0d9] mb-1 font-bold">
                  No Deal Selected
                </p>
                <p className="text-xs mb-4">
                  Create a proposal or enter an existing Deal ID to start negotiating terms in real-time.
                </p>
                <Link
                  to="/deal/new"
                  onClick={() => setIsOpen(false)}
                  className="text-xs px-4 py-2 rounded-xl bg-[#ff8a00] text-[#17120f] font-bold font-['Space_Grotesk']"
                >
                  Create New Proposal
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Pill Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#ff8a00] to-[#ffaa45] hover:from-[#ff961a] hover:to-[#ffb65e] text-[#17120f] font-['Space_Grotesk'] font-bold text-xs shadow-[0_8px_25px_rgba(255,138,0,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        aria-label="Open Negotiation Chat"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#17120f] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#17120f]" />
        </span>
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Deal Chat & Negotiation</span>
        <span className="sm:hidden">Chat</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
