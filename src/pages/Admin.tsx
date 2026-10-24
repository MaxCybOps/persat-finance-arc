// oxlint-disable-next-line -- admin page, owner-only
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { toast } from 'sonner'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useArcNetwork } from '../hooks/useArcNetwork'

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

const banner = (color: 'warn' | 'err' | 'info'): React.CSSProperties => ({
  background: color === 'warn' ? 'rgba(245,158,11,0.12)' : color === 'err' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${color === 'warn' ? 'rgba(245,158,11,0.3)' : color === 'err' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 13,
  color: color === 'warn' ? '#fcd34d' : color === 'err' ? '#fca5a5' : 'var(--subtle)',
})

const input: React.CSSProperties = {
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
  const { address, chainId, isWrongChain: wrongChain, addresses } = useArcNetwork()
  const [mintAmount, setMintAmount] = useState('1')
  const [mintTo, setMintTo]         = useState('')

  const { data: vaultSet,    refetch: refetchVault }   = useReadContract({ address: addresses.registry, abi: REGISTRY_ADMIN_ABI, functionName: 'vault',     chainId })
  const { data: owner }                                = useReadContract({ address: addresses.registry, abi: REGISTRY_ADMIN_ABI, functionName: 'owner',     chainId })
  const { data: cirBal,      refetch: refetchBal }     = useReadContract({ address: addresses.cirBtc,   abi: MOCK_ERC20_ABI,    functionName: 'balanceOf', args: [address ?? ZERO], chainId, query: { enabled: !!address } })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  if (isConfirmed) { void refetchVault(); void refetchBal() }

  const vaultWired = vaultSet && vaultSet !== ZERO
  const isOwner    = !!(owner && address && owner.toLowerCase() === address.toLowerCase())
  const busy       = isPending || isConfirming

  function doSetVault() {
    writeContract(
      { address: addresses.registry, abi: REGISTRY_ADMIN_ABI, functionName: 'setVault', args: [addresses.vault], chainId },
      { onSuccess: () => toast.success('setVault submitted (confirming)...'), onError: e => toast.error(e.message.slice(0, 120)) },
    )
  }

  function doMint() {
    const to = (mintTo.trim() || address) as `0x${string}` | undefined
    if (!to) { toast.error('No recipient'); return }
    const n = parseFloat(mintAmount)
    if (!n || n <= 0) { toast.error('Invalid amount'); return }
    writeContract(
      { address: addresses.cirBtc, abi: MOCK_ERC20_ABI, functionName: 'mint', args: [to, parseUnits(mintAmount, 8)], chainId },
      { onSuccess: () => toast.success('Mint submitted (confirming)...'), onError: e => toast.error(e.message.slice(0, 120)) },
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* heading */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Protocol Admin</h1>
        <p style={{ fontSize: 13, color: 'var(--subtle)', marginTop: 4 }}>One-time setup. Only the owner wallet can use these tools.</p>
      </div>

      {/* banners */}
      {wrongChain && <div style={banner('warn')}>Switch MetaMask to Arc Testnet (Chain ID 5042002).</div>}
      {!address   && <div style={banner('info')}>Connect your wallet to continue.</div>}
      {address && owner && !isOwner && (
        <div style={banner('err')}>
          Connected wallet is not the owner.<br />
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>Owner: {owner}</span>
        </div>
      )}

      {/* status */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Contract Status</p>
        {[
          { label: 'Registry', value: REGISTRY_ADDRESS },
          { label: 'Vault',    value: VAULT_ADDRESS },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--subtle)' }}>{r.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ink-2)' }}>{r.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
          <span style={{ color: 'var(--subtle)' }}>Vault wired</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: vaultWired ? 'var(--success)' : '#fcd34d' }}>
            {vaultWired ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {vaultWired ? 'Yes' : 'Not yet'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--subtle)' }}>Your cirBTC</span>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {cirBal !== undefined ? `${(Number(cirBal) / 1e8).toFixed(4)} cirBTC` : address ? '…' : '—'}
          </span>
        </div>
      </div>

      {/* setVault */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 1 — Wire Vault to Registry</p>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginBottom: 16 }}>One-time call. Required before any loan can activate. Owner only.</p>
        {vaultWired ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle size={16} /> Already wired — no action needed.
          </div>
        ) : (
          <button
            onClick={doSetVault}
            disabled={!isOwner || busy || wrongChain || !address}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 600, fontSize: 15,
              background: (!isOwner || busy || wrongChain || !address) ? 'rgba(247,147,26,0.3)' : 'var(--brand)',
              color: 'white', border: 'none', cursor: (!isOwner || busy || wrongChain || !address) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Confirming…</> : 'Call setVault'}
          </button>
        )}
      </div>

      {/* mint */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 2 — Mint Test cirBTC</p>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginBottom: 16 }}>Mint mock cirBTC for testing. Leave recipient blank to mint to your wallet.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--subtle)', display: 'block', marginBottom: 4 }}>Amount (cirBTC)</label>
            <input type="number" min="0.00000001" step="0.01" value={mintAmount} onChange={e => setMintAmount(e.target.value)} style={input} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--subtle)', display: 'block', marginBottom: 4 }}>Recipient (blank = your wallet)</label>
            <input type="text" placeholder="0x..." value={mintTo} onChange={e => setMintTo(e.target.value)} style={{ ...input, fontFamily: 'monospace' }} />
          </div>
          <button
            onClick={doMint}
            disabled={busy || wrongChain || !address}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 600, fontSize: 15,
              background: (busy || wrongChain || !address) ? 'rgba(255,255,255,0.08)' : 'var(--surface-strong)',
              color: 'var(--ink)', border: '1px solid var(--border)', cursor: (busy || wrongChain || !address) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Confirming…</> : 'Mint cirBTC'}
          </button>
        </div>
      </div>

      {/* tx link */}
      {txHash && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--subtle)' }}>
          Tx:{' '}
          <a href={`https://explorer.testnet.arc.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>
            {txHash.slice(0, 22)}…
          </a>
        </p>
      )}
    </div>
  )
}
