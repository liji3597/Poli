'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './client'
import type {
  WhaleTradesResponse,
  MarketsResponse,
  MarketDetailResponse,
  TraderLeaderboardResponse,
  TraderDetailResponse,
  AILeaderboardResponse,
  InsiderAlertsResponse,
  WhalesQueryParams,
  MarketsQueryParams,
  LeaderboardQueryParams,
  InsiderAlertsQueryParams,
} from './types'

// Generic hook state type
interface UseQueryState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Generic fetch hook
function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
): UseQueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, deps)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// ==================== Whale Trades Hooks ====================

export function useWhalesLive(params: WhalesQueryParams = {}) {
  return useQuery<WhaleTradesResponse>(
    () => api.getWhalesLive(params),
    [params.limit, params.offset, params.market_slug]
  )
}

// ==================== Markets Hooks ====================

export function useMarkets(params: MarketsQueryParams = {}) {
  return useQuery<MarketsResponse>(
    () => api.getMarkets(params),
    [params.limit, params.offset, params.active_only]
  )
}

export function useMarketDetail(slug: string) {
  return useQuery<MarketDetailResponse>(
    () => api.getMarketDetail(slug),
    [slug]
  )
}

// ==================== Traders Hooks ====================

export function useTradersLeaderboard(params: LeaderboardQueryParams = {}) {
  return useQuery<TraderLeaderboardResponse>(
    () => api.getTradersLeaderboard(params),
    [params.limit, params.min_trades, params.trader_type]
  )
}

export function useTraderDetail(address: string) {
  return useQuery<TraderDetailResponse>(
    () => api.getTraderDetail(address),
    [address]
  )
}

// ==================== AI Profile Hooks ====================

export function useAILeaderboard(params: LeaderboardQueryParams = {}) {
  return useQuery<AILeaderboardResponse>(
    () => api.getAILeaderboard(params),
    [params.limit, params.trader_type]
  )
}

// ==================== Insider Alerts Hooks ====================

export function useInsiderAlerts(params: InsiderAlertsQueryParams = {}) {
  return useQuery<InsiderAlertsResponse>(
    () => api.getInsiderAlerts(params),
    [params.suspect_only, params.limit, params.offset]
  )
}

// ==================== Polling Hook for Real-time Data ====================

export function usePollingWhales(params: WhalesQueryParams = {}, intervalMs = 10000) {
  const [data, setData] = useState<WhaleTradesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const result = await api.getWhalesLive(params)
        if (isMounted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    const interval = setInterval(fetchData, intervalMs)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [params.limit, params.offset, params.market_slug, intervalMs])

  return { data, isLoading, error }
}

// ==================== Health Check Hook ====================

export function useHealthCheck() {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.healthCheck()
        setIsConnected(true)
      } catch {
        setIsConnected(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return { isConnected, isChecking }
}
