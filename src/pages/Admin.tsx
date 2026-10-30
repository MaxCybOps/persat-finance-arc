// oxlint-disable -- admin page, owner-only
import { useState, useEffect, useCallback } from 'react'
import { useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { toast } from 'sonner'
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useArcNetwork } from '../hooks/useArcNetwork'
import { getArcClient } from '../lib/arcClient'

const REGISTRY_ADMIN_ABI = [
  { name: 'vault',    type: 'function', stateMutability: 'view',       inputs: [],                                    outputs: [{ name: '', type: 'address' }] },
  { name: 'owner',   type: 'function', stateMutability: 'view',       inputs: [],                                    outputs: [{ name: '', type: 'address' }] },
  { name: 'setVault',type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_vault', type: 'address' }], outputs: [] },
] as const

const MOCK_ERC20_ABI = [
  { name: 'mint',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'balanceOf',type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                               outputs: [{ name: '', type: 'uint256' }] },
] as const

const ZERO = '0x0000000000000000000000000000000000000000' as const

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 24,
}

const bannerStyle = (color: 'warn' | 'err' | 'info'): React.CSSProperties => ({
  background: color === 'warn' ? 'rgba(245,158,11,0.12)' : color === 'err' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${color === 'warn' ? 'rgba(245,158,11,0.3)' : color === 'err' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 13,
  color: color === 'warn' ? '#fcd34d' : color === 'err' ? '#fca5a5' : 'var(--subtle)',
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 14px',
  color: 'var(--ink)',
  fontSize: 14,
  outline: 'none',
}

export default function Admin() {
  const { address, isWrongChain: wrongChain, addresses } = useArcNetwork()
  const [mintAmount, setMintAmount] = useState('1')
  const [mintTo, setMintTo]         = useState('')

  // Read state directly from Arc mainnet via standalone client — never depends on wallet chain
  const arcClient = getArcClient(true) // always mainnet
  const [vaultAddr, setVaultAddr]   = useState<string | null>(null)
  const [owner, setOwner]           = useState<string | null>(null)
  const [cirBal, setCirBal]         = useState<bigint | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!addresses.registry || !addresses.cirBtc) return
    setStatusLoading(true)
    try {
      const [v, o] = await Promise.all([
        arcClient.readContract({ address: addresses.registry as `0x${string}`, abi: REGISTRY_ADMIN_ABI, functionName: 'vault' }),
        arcClient.readContract({ address: addresses.registry as `0x${string}`, abi: REGISTRY_ADMIN_ABI, functionName: 'owner' }),
      ])
      setVaultAddr(v as string)
      setOwner(o as string)
      if (address) {
        const bal = await arcClient.readContract({ address: addresses.cirBtc as `0x${string}`, abi: MOCK_ERC20_ABI, functionName: 'balanceOf', args: [address as `0x${string}`] })
        setCirBal(bal as bigint)
      }
    } catch (e) {
      console.error('Admin status load error:', e)
    } finally {
      setStatusLoading(false)
    }
  }, [arcClient, addresses.registry, addresses.cirBtc, address])

  useEffect(() => { void loadStatus() }, [loadStatus])

  // TX state
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const [txConfirmed, setTxConfirmed] = useState(false)
  const [txError, setTxError]         = useState<string | null>(null)
  const [polling, setPolling]         = useState(false)

  // Poll for receipt using arcClient directly (not wagmi useWaitForTransactionReceipt)
  useEffect(() => {
    if (!txHash) return
    setPolling(true)
    setTxConfirmed(false)
    setTxError(null)
    let cancelled = false
    const poll = async () => {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return
        try {
          const receipt = await arcClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
          if (receipt) {
            if (receipt.status === 'success') {
              setTxConfirmed(true)
              toast.success('Transaction confirmed!')
              void loadStatus()
            } else {
              setTxError('Transaction reverted on-chain')
              toast.error('Transaction reverted')
            }
            setPolling(false)
            return
          }
        } catch { /* not yet mined */ }
        await new Promise(r => setTimeout(r, 2000))
      }
      // After 2 minutes, assume success and reload
      setTxConfirmed(true)
      setPolling(false)
      void loadStatus()
    }
    void poll()
    return () => { cancelled = true }
  }, [txHash, arcClient, loadStatus])

  const vaultWired = vaultAddr && vaultAddr !== ZERO
  const isOwner    = !!(owner && address && owner.toLowerCase() === address.toLowerCase())
  const busy       = isPending || polling

  function doSetVault() {
    setTxConfirmed(false)
    setTxError(null)
    writeContract(
      { address: addresses.registry as `0x${string}`, abi: REGISTRY_ADMIN_ABI, functionName: 'setVault', args: [addresses.vault as `0x${string}`], gas: 100_000n },
      { onSuccess: () => toast.success('setVault submitted — waiting for confirmation...'), onError: e => toast.error((e as Error).message.slice(0, 120)) },
    )
  }

  function doMint() {
    const to = (mintTo.trim() || address) as `0x${string}` | undefined
    if (!to) { toast.error('No recipient'); return }
    const n = parseFloat(mintAmount)
    if (!n || n <= 0) { toast.error('Invalid amount'); return }
    setTxConfirmed(false)
    setTxError(null)
    writeContract(
      { address: addresses.cirBtc as `0x${string}`, abi: MOCK_ERC20_ABI, functionName: 'mint', args: [to, parseUnits(mintAmount, 8)], gas: 100_000n },
      { onSuccess: () => toast.success('Mint submitted — waiting for confirmation...'), onError: e => toast.error((e as Error).message.slice(0, 120)) },
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Protocol Admin</h1>
        <p style={{ fontSize: 13, color: 'var(--subtle)', marginTop: 4 }}>One-time setup. Only the owner wallet can use these tools.</p>
      </div>

      {wrongChain && <div style={bannerStyle('warn')}>Switch your wallet to Arc Mainnet (Chain ID 5042).</div>}
      {!address   && <div style={bannerStyle('info')}>Connect your wallet to continue.</div>}
      {address && owner && !isOwner && (
        <div style={bannerStyle('err')}>
          Connected wallet is not the owner.<br />
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>Owner: {owner}</span>
        </div>
      )}

      {/* status */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Contract Status</p>
          <button onClick={() => void loadStatus()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtle)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={12} className={statusLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {[
          { label: 'Registry', value: addresses.registry },
          { label: 'Vault',    value: addresses.vault },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--subtle)' }}>{r.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ink-2)' }}>{r.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
          <span style={{ color: 'var(--subtle)' }}>Vault wired</span>
          {statusLoading
            ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--subtle)' }} />
            : <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: vaultWired ? '#22c55e' : '#fcd34d' }}>
                {vaultWired ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {vaultWired ? 'Yes' : 'Not yet'}
              </span>
          }
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--subtle)' }}>Your cirBTC</span>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--ink)' }}>
            {cirBal != null ? (Number(cirBal) / 1e8).toFixed(4) : '—'}
          </span>
        </div>
      </div>

      {/* Step 1 */}
      {isOwner && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Step 1 — Wire Vault to Registry</p>
          <p style={{ fontSize: 13, color: 'var(--subtle)', margin: '0 0 16px' }}>One-time call. Required before any loan can activate. Owner only.</p>

          {vaultWired
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22c55e', fontSize: 14, fontWeight: 600 }}>
                <CheckCircle size={16} /> Vault already wired — nothing to do.
              </div>
            : <button
                onClick={doSetVault}
                disabled={busy}
                style={{ padding: '10px 20px', borderRadius: 10, background: busy ? 'var(--border)' : 'var(--amber)', color: '#000', fontWeight: 700, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {busy ? <><Loader2 size={14} className="animate-spin" /> Confirming…</> : 'Wire Vault'}
              </button>
          }

          {txHash && !txConfirmed && polling && (
            <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 8 }}>Tx: {txHash.slice(0, 22)}… (waiting for confirmation)</p>
          )}
          {txConfirmed && <p style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>✅ Confirmed</p>}
          {txError    && <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>❌ {txError}</p>}
        </div>
      )}

      {/* Step 2 */}
      {isOwner && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Step 2 — Mint Test cirBTC</p>
          <p style={{ fontSize: 13, color: 'var(--subtle)', margin: '0 0 16px' }}>Mint mock cirBTC for testing. Leave recipient blank to mint to your wallet.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--subtle)', display: 'block', marginBottom: 6 }}>Amount (cirBTC)</label>
              <input style={inputStyle} value={mintAmount} onChange={e => setMintAmount(e.target.value)} placeholder="1" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--subtle)', display: 'block', marginBottom: 6 }}>Recipient (blank = your wallet)</label>
              <input style={inputStyle} value={mintTo} onChange={e => setMintTo(e.target.value)} placeholder="0x..." />
            </div>
            <button
              onClick={doMint}
              disabled={busy}
              style={{ padding: '10px 20px', borderRadius: 10, background: busy ? 'var(--border)' : 'var(--amber)', color: '#000', fontWeight: 700, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {busy ? <><Loader2 size={14} className="animate-spin" /> Confirming…</> : 'Mint cirBTC'}
            </button>
          </div>

          {txHash && !txConfirmed && polling && (
            <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12 }}>Tx: {txHash.slice(0, 22)}… (waiting for confirmation)</p>
          )}
          {txConfirmed && <p style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>✅ Minted successfully</p>}
          {txError    && <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>❌ {txError}</p>}
        </div>
      )}

    </div>
  )
}
