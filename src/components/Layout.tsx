import { Link, useLocation } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, Plus, ShoppingCart, Bitcoin, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/deal/new', label: 'New Deal', icon: Plus },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { to: '/admin', label: 'Setup', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b"
        style={{
          background: 'rgba(13,27,47,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand)' }}
          >
            <Bitcoin size={15} style={{ color: 'var(--brand)' }} />
          </div>
          <span className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            Persat Finance
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline',
                pathname === to
                  ? 'text-white'
                  : 'hover:text-white',
              )}
              style={
                pathname === to
                  ? { background: 'var(--surface-strong)', color: 'var(--ink)' }
                  : { color: 'var(--subtle)' }
              }
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <ConnectKitButton />
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ background: 'rgba(13,27,47,0.95)', borderColor: 'var(--border)' }}
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-xs no-underline"
            style={{ color: pathname === to ? 'var(--accent)' : 'var(--subtle)' }}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 pb-20 md:pb-8">{children}</main>
    </div>
  )
}
