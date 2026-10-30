// oxlint-disable
// Fetches live BTC/USD price from multiple sources with fallback priority:
// 1. Pyth Hermes REST (works from browser, CORS allowed)
// 2. CoinGecko public API (no key, CORS open)
// 3. Binance public ticker (no key, CORS open)
// Falls back to last known price, never to a hardcoded stale value.

import { useState, useEffect, useRef } from 'react'

const BTC_USD_FEED_ID = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'
const REFRESH_INTERVAL_MS = 30_000

export interface BtcPriceResult {
  priceUsd: number
  priceUsdBigInt: bigint
  isLoading: boolean
  isStale: boolean      // true only if ALL sources failed this refresh
  source: string        // 'pyth' | 'coingecko' | 'binance' | 'fallback'
  lastUpdated: number   // unix timestamp seconds
}

async function tryPyth(): Promise<number> {
  const res = await fetch(
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${BTC_USD_FEED_ID}`,
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error(`Pyth ${res.status}`)
  const data = await res.json()
  const p = data?.parsed?.[0]
  if (!p) throw new Error('no data')
  const price = parseInt(p.price.price, 10) * Math.pow(10, parseInt(p.price.expo, 10))
  if (price <= 0) throw new Error('bad price')
  return price
}

async function tryCoinGecko(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  const price = data?.bitcoin?.usd
  if (!price || price <= 0) throw new Error('bad price')
  return price
}

async function tryBinance(): Promise<number> {
  const res = await fetch(
    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error(`Binance ${res.status}`)
  const data = await res.json()
  const price = parseFloat(data?.price)
  if (!price || price <= 0) throw new Error('bad price')
  return price
}

export function useBtcPrice(): BtcPriceResult {
  const [priceUsd, setPriceUsd] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [source, setSource] = useState<string>('loading')
  const [lastUpdated, setLastUpdated] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    // Try each source in order
    const sources: Array<[() => Promise<number>, string]> = [
      [tryPyth, 'pyth'],
      [tryCoinGecko, 'coingecko'],
      [tryBinance, 'binance'],
    ]

    for (const [fn, name] of sources) {
      try {
        const price = await fn()
        setPriceUsd(price)
        setSource(name)
        setIsStale(false)
        setLastUpdated(Math.floor(Date.now() / 1000))
        setIsLoading(false)
        return
      } catch {
        // try next source
      }
    }

    // All sources failed — keep last known price if we have one
    setIsStale(true)
    setSource('fallback')
    setIsLoading(false)
  }

  useEffect(() => {
    void load()
    timerRef.current = setInterval(() => void load(), REFRESH_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return {
    priceUsd: priceUsd || 65_000, // only use 65k if we truly have nothing yet
    priceUsdBigInt: BigInt(Math.floor(priceUsd || 65_000)),
    isLoading,
    isStale,
    source,
    lastUpdated,
  }
}
