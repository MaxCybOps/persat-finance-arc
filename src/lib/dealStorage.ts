export interface StoredDeal {
  dealId: `0x${string}`
  salt?: `0x${string}`
  role: 'borrower' | 'lender'
  principal: string
  collateral: string
  rateBps: string
  durationMonths: number
  visibility: 'private' | 'public'
  reservedFor?: string
  chainId: number
  txHash?: string
  createdAt: number
}

const STORAGE_KEY = 'persat_finance_stored_deals'

export function getStoredDeals(chainId?: number): StoredDeal[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all: StoredDeal[] = JSON.parse(raw)
    if (!chainId) return all
    return all.filter((d) => d.chainId === chainId)
  } catch {
    return []
  }
}

export function saveStoredDeal(deal: StoredDeal) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const existing = getStoredDeals()
    const filtered = existing.filter((d) => d.dealId.toLowerCase() !== deal.dealId.toLowerCase())
    localStorage.setItem(STORAGE_KEY, JSON.stringify([deal, ...filtered]))
  } catch (err) {
    console.error('Failed to save deal to localStorage:', err)
  }
}
