import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Copy, Check, Lock, Unlock, Info } from 'lucide-react'
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
} from '../lib/utils'
import { buildShareLink } from '../lib/share'
import { REGISTRY_ABI } from '../contracts/abis'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { saveStoredDeal } from '../lib/dealStorage'

type Tab = 'private' | 'public'
type Role = 'borrower' | 'lender'

export default function NewDeal() {
  const { address, isConnected, isWrongChain, chain, addresses, chainId } = useArcNetwork()

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

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: {
      enabled: Boolean(hash),
    },
  })

  // Build share link once we have a transaction hash or confirmation
  useEffect(() => {
    if (!hash) return
    void buildShareLink(`/deal/claim/${dealId}?salt=${salt}`).then(setShareLink)
  }, [hash, isSuccess, dealId, salt])

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
      salt: tab === 'private' ? salt : undefined,
      role,
      principal: form.principal,
      collateral: form.collateral,
      rateBps: form.rateBps,
      durationMonths: duration,
      visibility: tab,
      reservedFor: form.reservedFor || undefined,
      chainId,
      createdAt: Date.now(),
    })

    writeContract({
      address: addresses.registry,
      abi: REGISTRY_ABI,
      functionName: 'proposeDeal',
      args: [
        dealId,
        role === 'borrower',
        (tab === 'private' && form.reservedFor
          ? form.reservedFor
          : '0x0000000000000000000000000000000000000000') as `0x${string}`,
        principalRaw,
        collateralRaw,
        rateBpsRaw,
        duration,
        tab === 'private' ? 0 : 1, // Visibility enum
        tab === 'private' ? salt : ('0x' + '00'.repeat(32) as `0x${string}`),
      ],
      chainId,
    })
  }

  async function copyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Claim link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
        Create a Deal
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--subtle)' }}>
        Propose terms for a BTC-collateralised USDC loan.
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
            hint="If set, only this address can claim the link"
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

      {/* CTA */}
      {!isConnected ? (
        <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
          Connect your wallet to propose a deal
        </div>
      ) : isWrongChain ? (
        <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
          Switch your wallet to Arc Mainnet (5042) or Arc Testnet (5042002)
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid || isPending || isConfirming}
          onClick={submit}
        >
          {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Propose Deal'}
        </Button>
      )}

      <TxStatus
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        error={error ? parseOnchainError(error) : null}
        explorerUrl={hash ? `${chain.explorerBase}/tx/${hash}` : undefined}
      />

      {/* Share link */}
      {isSuccess && tab === 'private' && shareLink && (
        <Card className="mt-4">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success)' }}>
            Deal proposed! Share this claim link:
          </p>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mt-2"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <code className="mono text-xs flex-1 truncate" style={{ color: 'var(--muted)' }}>
              {shareLink}
            </code>
            <button onClick={() => void copyLink()} className="flex-shrink-0 p-1">
              {copied ? (
                <Check size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <Copy size={14} style={{ color: 'var(--subtle)' }} />
              )}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--subtle)' }}>
            This link contains the salt needed to claim. It is single-use and cannot be regenerated.
          </p>
        </Card>
      )}

      {isSuccess && tab === 'public' && (
        <Card className="mt-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
            Your order is live on the marketplace.
          </p>
        </Card>
      )}
    </div>
  )
}
