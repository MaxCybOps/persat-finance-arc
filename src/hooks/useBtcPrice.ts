// oxlint-disable
// Fetches live BTC/USD price from Pyth Hermes REST API.
// Feed ID: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43 (BTC/USD)
// Falls back to $65,000 if the fetch fails.

import { useState, useEffect, useRef } from 'react'

const BTC_USD_FEED_ID = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'
const HERMES_URL = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${BTC_USD_FEED_ID}`
const FALLBACK_PRICE = 65_000 // USD, used if Pyth is unreachable
const REFRESH_INTERVAL_MS = 30_000 // refresh every 30 seconds

export interface BtcPriceResult {
  priceUsd: number        // e.g. 67543.21
  priceUsdBigInt: bigint  // price in USD as integer (truncated), e.g. 67543n
  isLoading: boolean
  isStale: boolean        // true if using fallback
  lastUpdated: number     // unix timestamp seconds
}

async function fetchBtcPrice(): Promise<{ price: number; timestamp: number }> {
  const res = await fetch(HERMES_URL)
  if (!res.ok) throw new Error(`Pyth HTTP ${res.status}`)
  const data = await res.json()
  const parsed = data?.parsed?.[0]
  if (!parsed) throw new Error('No Pyth data')
  const rawPrice = parseInt(parsed.price.price, 10)
  const expo = parseInt(parsed.price.expo, 10)
  const price = rawPrice * Math.pow(10, expo)
  const timestamp = parsed.price.publish_time
  return { price, timestamp }
}

export function useBtcPrice(): BtcPriceResult {
  const [priceUsd, setPriceUsd] = useState<number>(FALLBACK_PRICE)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try {
      const { price, timestamp } = await fetchBtcPrice()
      if (price > 0) {
        setPriceUsd(price)
        setLastUpdated(timestamp)
        setIsStale(false)
      }
    } catch {
      setIsStale(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    timerRef.current = setInterval(() => void load(), REFRESH_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return {
    priceUsd,
    priceUsdBigInt: BigInt(Math.floor(priceUsd)),
    isLoading,
    isStale,
    lastUpdated,
  }
}
