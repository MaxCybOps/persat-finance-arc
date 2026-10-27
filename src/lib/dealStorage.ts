// oxlint-disable
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

// Pre-seeded on-chain testnet deals so counterparties discover them immediately
const SEED_DEALS: StoredDeal[] = [
  {
    dealId: '0x1ff59253e7d1deb8003ce16e05e51a3c',
    salt: '0x54e7e9d0bb858a971ee54282f1b0d409189632dc29f87bdda08ad86f25f9f909',
    role: 'borrower',
    principal: '1000',
    collateral: '0.000001',
    rateBps: '8',
    durationMonths: 6,
    visibility: 'private',
    reservedFor: '0xb0A49aD92001A1aCBEbD1b1BBc6BF27C4504D5d9',
    chainId: 5042002,
    txHash: '0xa789bd96f750b4b0d8eeeaa4e410ac1f6f35bf1a5a787c770d6f4d47b8f91af4',
    createdAt: 1793013341000,
  },
]

export function getStoredDeals(chainId?: number): StoredDeal[] {
  let userSaved: StoredDeal[] = []
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        userSaved = JSON.parse(raw)
      }
    } catch {
      userSaved = []
    }
  }

  // Merge seed deals with userSaved (userSaved takes precedence)
  const map = new Map<string, StoredDeal>()
  for (const s of SEED_DEALS) {
    map.set(s.dealId.toLowerCase(), s)
  }
  for (const u of userSaved) {
    map.set(u.dealId.toLowerCase(), u)
  }

  const all = Array.from(map.values())
  if (!chainId) return all
  return all.filter((d) => d.chainId === chainId)
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
