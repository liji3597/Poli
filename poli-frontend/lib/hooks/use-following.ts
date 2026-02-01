'use client'

import { useState, useEffect, useCallback } from 'react'

// 关注配置
export interface FollowConfig {
  enabled: boolean
  copyRatio: number // 跟单比例 10-100%
  maxPerTrade: number // 单笔最大额
  virtualCapital: number // 虚拟本金
}

// 关注的交易员
export interface FollowedTrader {
  address: string
  followedAt: number // 关注时间戳
  config: FollowConfig
}

const STORAGE_KEY = 'insider-hunter-following'

// 默认配置
const DEFAULT_CONFIG: FollowConfig = {
  enabled: true,
  copyRatio: 30,
  maxPerTrade: 1000,
  virtualCapital: 5000,
}

export function useFollowing() {
  const [followedTraders, setFollowedTraders] = useState<FollowedTrader[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // 从 localStorage 加载
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setFollowedTraders(parsed)
      }
    } catch (e) {
      console.error('Failed to load following data:', e)
    }
    setIsLoaded(true)
  }, [])

  // 保存到 localStorage
  const saveToStorage = useCallback((traders: FollowedTrader[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(traders))
    } catch (e) {
      console.error('Failed to save following data:', e)
    }
  }, [])

  // 关注交易员
  const follow = useCallback((address: string, config?: Partial<FollowConfig>) => {
    setFollowedTraders((prev) => {
      // 检查是否已关注
      if (prev.some((t) => t.address.toLowerCase() === address.toLowerCase())) {
        return prev
      }
      const newTrader: FollowedTrader = {
        address: address.toLowerCase(),
        followedAt: Date.now(),
        config: { ...DEFAULT_CONFIG, ...config },
      }
      const updated = [...prev, newTrader]
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // 取消关注
  const unfollow = useCallback((address: string) => {
    setFollowedTraders((prev) => {
      const updated = prev.filter((t) => t.address.toLowerCase() !== address.toLowerCase())
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // 更新配置
  const updateConfig = useCallback((address: string, config: Partial<FollowConfig>) => {
    setFollowedTraders((prev) => {
      const updated = prev.map((t) => {
        if (t.address.toLowerCase() === address.toLowerCase()) {
          return { ...t, config: { ...t.config, ...config } }
        }
        return t
      })
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // 检查是否已关注
  const isFollowing = useCallback((address: string) => {
    return followedTraders.some((t) => t.address.toLowerCase() === address.toLowerCase())
  }, [followedTraders])

  // 获取关注配置
  const getConfig = useCallback((address: string): FollowConfig | null => {
    const trader = followedTraders.find((t) => t.address.toLowerCase() === address.toLowerCase())
    return trader?.config || null
  }, [followedTraders])

  // 获取关注地址列表
  const followedAddresses = followedTraders.map((t) => t.address)

  return {
    followedTraders,
    followedAddresses,
    isLoaded,
    follow,
    unfollow,
    updateConfig,
    isFollowing,
    getConfig,
    count: followedTraders.length,
  }
}

// 计算模拟盈亏
export function calculateSimulatedPnL(
  traderRoi: number,
  config: FollowConfig
): { invested: number; pnl: number; trades: number } {
  const invested = config.virtualCapital * (config.copyRatio / 100)
  const pnl = invested * (traderRoi / 100)
  const trades = Math.floor(Math.random() * 15) + 5 // 模拟跟单次数
  return { invested, pnl, trades }
}
