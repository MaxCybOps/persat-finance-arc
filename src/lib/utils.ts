import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shorten an address for display: 0x1234...abcd */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/** Format a basis-points rate as a percentage string: 500 → "5.00%" */
export function formatBps(bps: bigint | number): string {
  const n = typeof bps === 'bigint' ? Number(bps) : bps
  return `${(n / 100).toFixed(2)}%`
}

/** Format USDC amount (6 decimals) to display string */
export function formatUsdc(raw: bigint): string {
  const n = Number(raw) / 1e6
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Parse a USDC display string to raw bigint (6 decimals) */
export function parseUsdc(display: string): bigint {
  const n = parseFloat(display.replace(/,/g, ''))
  if (isNaN(n)) return 0n
  return BigInt(Math.round(n * 1e6))
}

/** Format cirBTC amount (8 decimals) to display string */
export function formatBtc(raw: bigint): string {
  const n = Number(raw) / 1e8
  return n.toFixed(8)
}

/** Parse cirBTC display string to raw bigint (8 decimals) */
export function parseBtc(display: string): bigint {
  const n = parseFloat(display)
  if (isNaN(n)) return 0n
  return BigInt(Math.round(n * 1e8))
}

/**
 * Compute monthly payment schedule for a fixed-rate loan.
 * interest = principal * rateBps * durationMonths / (10000 * 12)
 */
export function computeRepayment(
  principal: bigint,
  rateBps: bigint,
  durationMonths: number,
): { interest: bigint; total: bigint } {
  const interest = (principal * rateBps * BigInt(durationMonths)) / (10_000n * 12n)
  return { interest, total: principal + interest }
}

/**
 * Compute current LTV given collateral amount, BTC/USD price (8 dec), and principal (6 dec USDC).
 * Returns basis points (e.g. 7500 = 75%).
 */
export function computeLtv(
  collateralRaw: bigint,
  btcPriceRaw: bigint,
  principalUsdc: bigint,
): number {
  if (collateralRaw === 0n || btcPriceRaw === 0n) return 0
  // collateralUsdValue (6 dec) = collateralRaw(8 dec) * btcPrice(8 dec) / 1e8 / 1e2
  // = collateralRaw * btcPriceRaw / 1e10
  const collateralUsdValue = (collateralRaw * btcPriceRaw) / 10_000_000_000n
  if (collateralUsdValue === 0n) return 0
  return Number((principalUsdc * 10_000n) / collateralUsdValue)
}

/** DealState enum values matching the contract */
export const DealState = {
  Proposed: 0,
  Confirmed: 1,
  Active: 2,
  Completed: 3,
  Defaulted: 4,
  Liquidated: 5,
  Cancelled: 6,
} as const

export type DealStateValue = (typeof DealState)[keyof typeof DealState]

export function dealStateLabel(s: number): string {
  const map: Record<number, string> = {
    0: 'Proposed',
    1: 'Confirmed',
    2: 'Active',
    3: 'Completed',
    4: 'Defaulted',
    5: 'Liquidated',
    6: 'Cancelled',
  }
  return map[s] ?? 'Unknown'
}

export function dealStateColor(s: number): string {
  if (s === DealState.Active) return 'text-emerald-300 bg-emerald-900/40'
  if (s === DealState.Confirmed) return 'text-blue-300 bg-blue-900/40'
  if (s === DealState.Proposed) return 'text-amber-300 bg-amber-900/40'
  if (s === DealState.Completed) return 'text-slate-300 bg-slate-700/50'
  if (s === DealState.Defaulted || s === DealState.Liquidated)
    return 'text-rose-300 bg-rose-900/40'
  return 'text-slate-400 bg-slate-800/50'
}

/** Generate a cryptographically random bytes32 salt */
export function randomSalt(): `0x${string}` {
  const arr = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

/** Generate a random bytes16 deal ID */
export function randomDealId(): `0x${string}` {
  const arr = crypto.getRandomValues(new Uint8Array(16))
  return `0x${Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance'))
    return 'Insufficient balance to cover this transaction.'
  if (msg.includes('dealnotactive')) return 'Deal is not in the required state.'
  if (msg.includes('notborrower')) return 'Only the borrower can call this function.'
  if (msg.includes('termshash')) return 'Deal terms have changed — please refresh.'
  if (msg.includes('ltvhealthy')) return 'LTV is healthy — liquidation not available.'
  if (msg.includes('oraclestale')) return 'Price oracle is stale. Try again shortly.'
  if (msg.includes('invalidclaimtoken')) return 'This claim link is invalid or already used.'
  if (msg.includes('reverted')) return 'Transaction failed. Check your balances and approvals.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please try again.'
  return 'Something went wrong. Please try again.'
}
