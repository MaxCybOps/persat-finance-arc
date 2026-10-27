// oxlint-disable
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { Copy, Check, Lock, Unlock, Info, ArrowRight, MessageSquare, ExternalLink, CheckCircle2, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Card, Button, Input, TxStatus } from '../components/ui'
import {
  randomDealId,
  randomSalt,
  formatUsdc,
  parseUsdc,
  parseBtc,
  formatBtc,
  computeRepayment,
  parseOnchainError,
  deriveSaltForCounterparty,
} from '../lib/utils'
import { buildShareLink } from '../lib/share'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { addArcNetwork } from '../lib/networkUtils'
import { saveStoredDeal } from '../lib/dealStorage'
import { DealChat } from '../components/DealChat'

type Tab = 'private' | 'public'
type Role = 'borrower' | 'lender'

export default function NewDeal() {
  const { address, isConnected, isWrongChain, chain, addresses, chainId } = useArcNetwork()
  const publicClient = usePublicClient({ chainId })

  const [tab, setTab] = useState<Tab>('private')
  const [role, setRole] = useState<Role>('borrower')
  const [form, setForm] = useState({
    principal: '',
    collateral: '',
    rateBps: '',
    durationMonths: '',
    reservedFor: '',
  })
  const [dealId] = useState<`0x${string}`>(randomDealId)
  const [salt] = useState<`0x${string}`>(randomSalt)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [receiptConfirmed, setReceiptConfirmed] = useState(false)
  const [minedBlock, setMinedBlock] = useState<bigint | null>(null)

  const { writeContract, data: hash, isPending, error } = useWriteContract()

  // Show errors immediately as a toast so they are never missed
  useEffect(() => {
    if (error) {
      toast.error(parseOnchainError(error), { duration: 8000 })
    }
  }, [error])

  // Standard Wagmi wait
  const { isSuccess: isWagmiSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: {
      enabled: Boolean(hash),
    },
  })

  // Fast sub-second direct poller so the UI never stays stuck on 'Confirming...'
  useEffect(() => {
    if (!hash || receiptConfirmed || !publicClient) return
    let active = true
    const interval = setInterval(async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash })
        if (receipt && receipt.status === 'success' && active) {
          setReceiptConfirmed(true)
          if (receipt.blockNumber) setMinedBlock(receipt.blockNumber)
          clearInterval(interval)
          toast.success('Deal proposed & confirmed on Arc Testnet!')
        }
      } catch {
        // Pending next block
      }
    }, 1000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [hash, receiptConfirmed, publicClient])

  const isConfirmed = isWagmiSuccess || receiptConfirmed
  const isConfirming = Boolean(hash) && !isConfirmed

  // Compute effective salt: If counterparty address is set, use deterministic derived salt
  const hasCounterparty = form.reservedFor.trim().startsWith('0x') && form.reservedFor.trim().length === 42
  const effectiveSalt = tab === 'private'
    ? (hasCounterparty
        ? deriveSaltForCounterparty(dealId, form.reservedFor.trim() as `0x${string}`)
        : salt)
    : ('0x' + '00'.repeat(32) as `0x${string}`)

  // Build share link proactively
  useEffect(() => {
    void buildShareLink(`/deal/claim/${dealId}?salt=${effectiveSalt}`).then(setShareLink)
  }, [dealId, effectiveSalt])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const principalRaw = parseUsdc(form.principal)
  const collateralRaw = parseBtc(form.collateral)
  const rateBpsRaw = BigInt(Math.round(parseFloat(form.rateBps || '0') * 100))
  const duration = parseInt(form.durationMonths || '0')

  const { interest, total } = principalRaw > 0n && rateBpsRaw > 0n && duration > 0
    ? computeRepayment(principalRaw, rateBpsRaw, duration)
    : { interest: 0n, total: 0n }

  const btcPriceEstimate = 60_000n // placeholder for display LTV calc
  const collateralUsdEst = (collateralRaw * btcPriceEstimate) / 100_000_000n
  const ltvEst = collateralUsdEst > 0n ? Number((principalRaw * 10_000n) / collateralUsdEst) / 100 : 0

  const isValid =
    principalRaw > 0n &&
    collateralRaw > 0n &&
    rateBpsRaw > 0n &&
    duration > 0 &&
    duration <= 24

  function submit() {
    if (!isValid || !address) return

    // Save to local registry so creator and counterparty have full access
    saveStoredDeal({
      dealId,
      salt: tab === 'private' ? effectiveSalt : undefined,
      role,
      principal: form.principal,
      collateral: form.collateral,
      rateBps: form.rateBps,
      durationMonths: duration,
      visibility: tab,
      reservedFor: form.reservedFor.trim() || undefined,
      chainId,
      txHash: undefined,
      createdAt: Date.now(),
    })

    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'proposeDeal',
      args: [
        dealId,
        role === 'borrower',
        (tab === 'private' && form.reservedFor.trim()
          ? form.reservedFor.trim()
          : '0x0000000000000000000000000000000000000000') as `0x${string}`,
        principalRaw,
        collateralRaw,
        rateBpsRaw,
        duration,
        tab === 'private' ? 0 : 1, // Visibility enum
        effectiveSalt,
      ],
      chainId,
      // Arc Testnet RPC rejects eth_estimateGas for long calldata ("Invalid params").
      // Setting gas manually bypasses the estimate and sends directly to MetaMask.
      gas: 300_000n,
    })
  }

  // Update txHash in stored deal once available
  useEffect(() => {
    if (hash) {
      saveStoredDeal({
        dealId,
        salt: tab === 'private' ? effectiveSalt : undefined,
        role,
        principal: form.principal,
        collateral: form.collateral,
        rateBps: form.rateBps,
        durationMonths: duration,
        visibility: tab,
        reservedFor: form.reservedFor.trim() || undefined,
        chainId,
        txHash: hash,
        createdAt: Date.now(),
      })
    }
  }, [hash, dealId, effectiveSalt, role, form, duration, tab, chainId])

  async function copyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Deal claim link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
        Create a Deal
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--subtle)' }}>
        Propose terms for a BTC-collateralised USDC loan on Arc.
      </p>

      {/* Tab */}
      <div
        className="flex rounded-xl p-1 mb-6"
        style={{ background: 'var(--surface-muted)' }}
      >
        {(['private', 'public'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={
              tab === t
                ? { background: 'var(--surface-strong)', color: 'var(--ink)' }
                : { background: 'transparent', color: 'var(--subtle)' }
            }
          >
            {t === 'private' ? (
              <span className="flex items-center justify-center gap-1.5">
                <Lock size={13} /> Private Link
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Unlock size={13} /> Open Marketplace
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Role */}
      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
          I am the
        </p>
        <div className="flex gap-2">
          {(['borrower', 'lender'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all border"
              style={{
                background: role === r ? 'var(--brand-muted)' : 'transparent',
                borderColor: role === r ? 'var(--brand)' : 'var(--border)',
                color: role === r ? 'var(--brand)' : 'var(--subtle)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      {/* Terms */}
      <Card className="mb-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Principal (USDC)"
            placeholder="e.g. 1000"
            value={form.principal}
            onChange={set('principal')}
            type="number"
            min="0"
          />
          <Input
            label="Collateral (cirBTC)"
            placeholder="e.g. 0.03"
            value={form.collateral}
            onChange={set('collateral')}
            type="number"
            min="0"
          />
          <Input
            label="Annual Rate (%)"
            placeholder="e.g. 8"
            value={form.rateBps}
            onChange={set('rateBps')}
            type="number"
            min="0"
            hint="e.g. 8 = 8% per year"
          />
          <Input
            label="Duration (months)"
            placeholder="e.g. 6"
            value={form.durationMonths}
            onChange={set('durationMonths')}
            type="number"
            min="1"
            max="24"
            hint="1–24 months"
          />
        </div>

        {tab === 'private' && (
          <Input
            label="Counterparty wallet (optional)"
            placeholder="0x... — leave blank for open link"
            value={form.reservedFor}
            onChange={set('reservedFor')}
            hint="If set, only this address can seal the deal. They can also discover it directly in their Persat Dashboard!"
          />
        )}
      </Card>

      {/* Live calculator */}
      {principalRaw > 0n && (
        <Card className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>
            Payment preview
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['Principal', `$${formatUsdc(principalRaw)}`],
              ['Interest', `$${formatUsdc(interest)}`],
              ['Total repayment', `$${formatUsdc(total)}`],
              ['Collateral', `${formatBtc(collateralRaw)} BTC`],
              ['Est. LTV', ltvEst > 0 ? `${ltvEst.toFixed(1)}%` : '—'],
              ['Liquidation LTV', '80%'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--subtle)' }}>{k}</span>
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color:
                      k === 'Est. LTV' && ltvEst > 75
                        ? 'var(--danger)'
                        : k === 'Est. LTV' && ltvEst > 60
                        ? '#f7931a'
                        : 'var(--ink)',
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          {ltvEst > 75 && (
            <div className="flex items-center gap-2 mt-3 text-xs p-2 rounded-lg" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
              <Info size={12} />
              LTV is close to the 80% liquidation threshold. Consider adding more collateral.
            </div>
          )}
        </Card>
      )}

      {/* Deal ID preview */}
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          Deal ID:{' '}
        </p>
        <code className="mono text-xs" style={{ color: 'var(--muted)' }}>
          {dealId.slice(0, 18)}...
        </code>
      </div>

      {/* CTA Button */}
      {!isConnected ? (
        <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
          Connect your wallet to propose a deal
        </div>
      ) : isWrongChain ? (
        <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.3)', borderRadius: 12 }}>
          <p className="mb-3 font-semibold" style={{ color: 'var(--danger)' }}>Wrong Network</p>
          <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
            Your wallet is on the wrong network. Click below to switch to Arc Testnet — works with MetaMask, OKX, and any EVM wallet.
          </p>
          <button
            onClick={() => addArcNetwork('testnet')}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--brand)', color: '#17120f', border: 'none', cursor: 'pointer' }}
          >
            Switch to Arc Testnet
          </button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid || isPending || isConfirming}
          onClick={submit}
        >
          {isPending
            ? 'Confirm in wallet...'
            : isConfirming
            ? 'Confirming on Arc Testnet...'
            : isConfirmed
            ? 'Deal Proposed & Confirmed!'
            : 'Propose Deal'}
        </Button>
      )}

      <TxStatus
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isConfirmed}
        error={error ? parseOnchainError(error) : null}
        explorerUrl={hash ? `${chain.explorerBase}/tx/${hash}` : undefined}
      />

      {/* Transaction & Proposal Status Card - Renders as soon as hash is broadcasted! */}
      {hash && tab === 'private' && (
        <Card className={`mt-4 border ${isConfirmed ? 'border-[#10b981]' : 'border-[#ff8a00]'} shadow-lg`}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <div className="flex items-center gap-2">
              {isConfirmed ? (
                <CheckCircle2 size={18} className="text-[#10b981]" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a00] animate-ping" />
              )}
              <h3 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
                {isConfirmed ? 'Deal Successfully Proposed on Arc!' : 'Transaction Broadcasted to Arc'}
              </h3>
            </div>
            <a
              href={`${chain.explorerBase}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#ff8a00] hover:underline flex items-center gap-1 font-['Space_Grotesk']"
            >
              <span>View Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Important explanation about EVM wallet push notifications */}
          <div className="p-3 rounded-xl bg-[#120d0a] border border-[#564334]/30 text-xs text-[#ddc1ae] space-y-2 mb-4">
            <p className="font-semibold text-[#ebe0d9] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#ff8a00]" />
              How your counterparty seals this deal:
            </p>
            <p>
              1. <strong>Send the claim link below:</strong> Blockchains do not push pop-up notifications directly into wallets like OKX or MetaMask. You must send them the invitation link (via Telegram, WhatsApp, Discord, or Email).
            </p>
            <p>
              2. <strong>Or direct Dashboard discovery:</strong> Since you set their address <code className="text-[#ebe0d9] font-bold">{form.reservedFor ? form.reservedFor.slice(0, 10) + '...' : ''}</code>, they can also simply open the <strong>Persat Dashboard</strong> with their wallet connected and find this deal under the <strong className="text-[#ff8a00]">Incoming Invitations</strong> tab!
            </p>
          </div>

          <p className="text-xs font-semibold text-[#ebe0d9] mb-1">
            Deal Invitation Link:
          </p>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <code className="mono text-xs flex-1 truncate text-[#ddc1ae]">
              {shareLink}
            </code>
            <button onClick={() => void copyLink()} className="flex-shrink-0 p-1.5 rounded-lg bg-[#ff8a00] text-[#17120f] font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-[#ffaa45] transition-colors">
              {copied ? (
                <>
                  <Check size={14} /> <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} /> <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Share via messaging apps */}
          {shareLink && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-[#ebe0d9] mb-2">Share directly via:</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to a USDC loan deal on Persat Finance. Review and accept here: ${shareLink}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25d366]/15 border border-[#25d366]/40 text-[#25d366] text-xs font-bold font-['Space_Grotesk'] hover:bg-[#25d366]/25 transition-colors"
                >
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent('You\'ve been invited to a USDC loan deal on Persat Finance. Review the terms and accept:')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2aabee]/15 border border-[#2aabee]/40 text-[#2aabee] text-xs font-bold font-['Space_Grotesk'] hover:bg-[#2aabee]/25 transition-colors"
                >
                  <span>Telegram</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent('Persat Finance — Loan Deal Invitation')}&body=${encodeURIComponent(`You've been invited to a BTC-collateralised USDC loan deal on Persat Finance.\n\nReview the terms and accept here:\n${shareLink}\n\nYou'll need a MetaMask wallet on Arc Testnet (Chain ID: 5042002, RPC: https://rpc.testnet.arc.io) to accept.`)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#a58c7b]/15 border border-[#a58c7b]/40 text-[#ddc1ae] text-xs font-bold font-['Space_Grotesk'] hover:bg-[#a58c7b]/25 transition-colors"
                >
                  <span>Email</span>
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-[var(--border)] mt-4">
            <Link to={`/deal/claim/${dealId}?salt=${effectiveSalt}`} className="flex-1">
              <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                <MessageSquare size={14} />
                <span>Open Deal Room & Live Chat</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
            <Link to={`/dashboard`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                <span>View in Dashboard</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Embedded Live Deal Chat */}
      {hash && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <h3 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
              Deal Negotiation & Chat Channel
            </h3>
          </div>
          <p className="text-xs text-[#a58c7b] mb-2">
            Your counterparty can join this room via the invitation link above. Send notes or coordinate loan terms right here:
          </p>
          <DealChat
            dealId={dealId}
            borrower={role === 'borrower' ? address! : ''}
            lender={role === 'lender' ? address! : ''}
            currentAddress={address}
            dealStateLabel={isConfirmed ? 'Proposed' : 'Broadcasting'}
          />
        </div>
      )}

      {hash && tab === 'public' && (
        <Card className="mt-4">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--success)' }}>
            Your order is live on the marketplace.
          </p>
          <Link to="/marketplace">
            <Button variant="primary" size="sm">View on Marketplace &rarr;</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
