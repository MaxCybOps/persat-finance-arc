// oxlint-disable
import { Link, useLocation } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useChainId } from 'wagmi'
import { LayoutDashboard, Plus, ShoppingCart, Settings, Flame, Wifi } from 'lucide-react'
import { cn } from '../lib/utils'
import { FloatingChatDrawer } from './FloatingChatDrawer'
import { addArcNetwork } from '../lib/networkUtils'
import { useState } from 'react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/deal/new', label: 'New Deal', icon: Plus },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { to: '/admin', label: 'Setup', icon: Settings },
]

// Accepted Arc chain IDs
const ARC_CHAIN_IDS = [5042, 5042002]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [addingNetwork, setAddingNetwork] = useState(false)

  const isOnArc = ARC_CHAIN_IDS.includes(chainId)
  const showNetworkButton = isConnected && !isOnArc

  const handleAddNetwork = async () => {
    setAddingNetwork(true)
    try {
      await addArcNetwork('testnet')
    } finally {
      setAddingNetwork(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#17120f] text-[#ebe0d9]">
      {/* Wrong network banner */}
      {showNetworkButton && (
        <div className="w-full bg-red-900/40 border-b border-red-500/40 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
          <span className="text-red-300 font-semibold">⚠️ Wrong Network Detected</span>
          <button
            onClick={handleAddNetwork}
            disabled={addingNetwork}
            className="px-4 py-1.5 rounded-full bg-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold hover:bg-[#ffaa45] transition-colors cursor-pointer disabled:opacity-50"
          >
            {addingNetwork ? 'Adding...' : 'Switch to Arc Testnet'}
          </button>
        </div>
      )}

      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 h-16 border-b"
        style={{
          background: 'rgba(18, 13, 10, 0.92)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(86, 67, 52, 0.4)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(255,138,0,0.3)]"
            style={{ background: 'rgba(255,138,0,0.15)', border: '1px solid rgba(255,138,0,0.4)' }}
          >
            <Flame size={16} className="text-[#ff8a00]" />
          </div>
          <span className="font-['Space_Grotesk'] font-bold text-base tracking-wider text-[#ebe0d9]">
            PERSAT
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-["Space_Grotesk"] font-bold transition-all no-underline',
                pathname === to
                  ? 'bg-[#ff8a00] text-[#17120f] shadow-sm'
                  : 'text-[#ddc1ae] hover:text-[#ebe0d9] hover:bg-[#241f1a]',
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet + Add Network */}
        <div className="flex items-center gap-2">
          {isConnected && !isOnArc && (
            <button
              onClick={handleAddNetwork}
              disabled={addingNetwork}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff8a00]/15 text-[#ff8a00] font-['Space_Grotesk'] text-[11px] font-bold border border-[#ff8a00]/40 hover:bg-[#ff8a00]/25 transition-colors cursor-pointer"
            >
              <Wifi size={12} />
              {addingNetwork ? 'Adding...' : 'Add Arc Network'}
            </button>
          )}
          <ConnectKitButton />
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ background: '#120d0a', borderColor: 'rgba(86, 67, 52, 0.4)' }}
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-['Space_Grotesk'] font-bold no-underline transition-colors"
            style={{ color: pathname === to ? '#ff8a00' : '#a58c7b' }}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      {/* Global Floating P2P Deal Negotiation Drawer */}
      <FloatingChatDrawer />
    </div>
  )
}
