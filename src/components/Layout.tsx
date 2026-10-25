import { Link, useLocation } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, Plus, ShoppingCart, Bitcoin, Settings, Flame } from 'lucide-react'
import { cn } from '../lib/utils'
import { FloatingChatDrawer } from './FloatingChatDrawer'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/deal/new', label: 'New Deal', icon: Plus },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { to: '/admin', label: 'Setup', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh flex flex-col bg-[#17120f] text-[#ebe0d9]">
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

        {/* Wallet */}
        <div className="flex items-center gap-2">
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
