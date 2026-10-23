import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Bitcoin, DollarSign, Percent, Clock, ArrowRight } from 'lucide-react'
import { Card, Button, Input } from '../components/ui'
import { shortAddr } from '../lib/utils'
import { REGISTRY_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contracts/addresses'
import { requireChain } from '@/onchain-facts'

const chain = requireChain(ARC_TESTNET_CHAIN_ID)

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const navigate = useNavigate()
  const [jumpId, setJumpId] = useState('')

  function goToDeal() {
    const id = jumpId.trim()
    if (!id) return
    void navigate(`/deal/${id}/manage`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>
            {isConnected ? `Connected: ${shortAddr(address!)}` : 'Connect your wallet to view your deals'}
          </p>
        </div>
        {isConnected && (
          <Link to="/deal/new">
            <Button variant="primary" size="md">
              <Plus size={15} />
              New Deal
            </Button>
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Loans', value: '—', icon: DollarSign },
          { label: 'cirBTC Locked', value: '—', icon: Bitcoin },
          { label: 'Avg Rate', value: '—', icon: Percent },
          { label: 'Network', value: 'Arc Testnet', icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color: 'var(--subtle)' }} />
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--subtle)' }}>
                {label}
              </p>
            </div>
            <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {value}
            </p>
          </Card>
        ))}
      </div>

      {/* Connect prompt */}
      {!isConnected && (
        <Card className="text-center py-16">
          <Bitcoin size={40} className="mx-auto mb-4" style={{ color: 'var(--brand)' }} />
          <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Peer-to-peer BTC lending
          </h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--subtle)' }}>
            Lock cirBTC as collateral. Borrow USDC at fixed terms. Trust-minimized, permissionless, and fully on-chain on Arc.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/deal/new">
              <Button variant="primary">
                <Plus size={14} />
                Create a Deal
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="secondary">Browse Marketplace</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Connected — jump to deal + create CTA */}
      {isConnected && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
              Your Deals
            </h2>
            <p className="text-xs mono" style={{ color: 'var(--subtle)' }}>
              {shortAddr(address!)}
            </p>
          </div>

          {/* Jump to any deal by ID */}
          <Card className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
              Open a Deal by ID
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="0x1a2b3c... (deal ID)"
                value={jumpId}
                onChange={(e) => setJumpId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToDeal()}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="md"
                disabled={!jumpId.trim()}
                onClick={goToDeal}
              >
                <ArrowRight size={15} />
                Go
              </Button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--subtle)' }}>
              Paste any deal ID to view its state, approve tokens, activate, repay, or liquidate.
            </p>
          </Card>

          {/* Empty state with CTAs */}
          <Card className="text-center py-10">
            <p className="text-sm mb-4" style={{ color: 'var(--subtle)' }}>
              On-chain event indexing is coming. Until then, use a deal ID to manage any loan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/deal/new">
                <Button variant="primary" size="md">
                  <Plus size={14} />
                  Create a Deal
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="secondary" size="md">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Protocol info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Private Deal Links',
            desc: 'Create terms, generate a single-use claim link, and share it directly with your counterparty.',
            icon: '🔗',
          },
          {
            title: 'Open Marketplace',
            desc: 'Post or browse structured lending/borrowing requests. Counter-offers are numbers only — no free-text.',
            icon: '📋',
          },
          {
            title: 'Auto Liquidation',
            desc: 'If LTV exceeds 80%, anyone can trigger permissionless liquidation. Oracle-driven, no centralized operator.',
            icon: '⚡',
          },
        ].map(({ title, desc, icon }) => (
          <Card key={title}>
            <p className="text-xl mb-2">{icon}</p>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>
              {title}
            </h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              {desc}
            </p>
          </Card>
        ))}
      </div>

      {/* Explorer link */}
      <p className="text-center text-xs mt-6" style={{ color: 'var(--subtle)' }}>
        Registry:{' '}
        <a
          href={`${chain.explorerBase}/address/${REGISTRY_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline mono"
          style={{ color: 'var(--accent)' }}
        >
          {shortAddr(REGISTRY_ADDRESS)}
        </a>
        {' · '}
        Vault:{' '}
        <a
          href={`${chain.explorerBase}/address/0x79a374e95a85611a95847ed9939a63be96418e49`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline mono"
          style={{ color: 'var(--accent)' }}
        >
          {shortAddr('0x79a374e95a85611a95847ed9939a63be96418e49')}
        </a>
      </p>
    </div>
  )
}
