'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn, formatNumber, formatTimeAgo, getTagEmoji } from '@/lib/utils'
import { useHasMounted } from '@/lib/hooks/use-has-mounted'
import { useFollowing, calculateSimulatedPnL, type FollowConfig } from '@/lib/hooks/use-following'
import { useTradersLeaderboard, useWhalesLive } from '@/lib/api/hooks'
import { getTradersWithFallback } from '@/lib/api/adapter'
import type { TraderProfile } from '@/lib/mock-data'
import { Star, Settings, Eye, Sliders, UserMinus, Loader2, UserPlus } from 'lucide-react'

// 跟单卡片组件
function FollowedTraderCard({
  trader,
  followConfig,
  onUpdateConfig,
  onUnfollow,
}: {
  trader: TraderProfile
  followConfig: FollowConfig
  onUpdateConfig: (config: Partial<FollowConfig>) => void
  onUnfollow: () => void
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState(followConfig)

  // 根据交易员 ROI 计算模拟盈亏
  const simulated = useMemo(() => {
    return calculateSimulatedPnL(trader.roi, config)
  }, [trader.roi, config])

  const status = trader.recentPerformance.status === 'good' ? 'active' : 'warning'

  const handleConfigChange = (newConfig: Partial<FollowConfig>) => {
    const updated = { ...config, ...newConfig }
    setConfig(updated)
    onUpdateConfig(newConfig)
  }

  return (
    <div className="cyber-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href={`/traders/${trader.address}`} className="font-mono text-base font-medium text-foreground hover:text-neon-cyan transition-smooth-fast">
            {trader.shortAddress}
          </Link>
          <div className="mt-2 flex flex-wrap gap-1">
            {trader.tags.slice(0, 4).map((tag: string) => (
              <span key={tag} className="text-sm" title={tag}>{getTagEmoji(tag)}</span>
            ))}
          </div>
        </div>
        <div className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", status === 'active' ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-neon-red/10 text-neon-red border border-neon-red/20")}>
          {status === 'active' ? '✅ 活跃' : '⚠️ 警示'}
        </div>
      </div>

      {/* 交易员真实数据 */}
      <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-cyber-darker border border-cyber-border p-3">
        <div>
          <div className="text-[10px] text-dim-gray font-mono">胜率</div>
          <div className="mt-1 text-base font-bold text-neon-cyan font-mono">{trader.winRate}%</div>
        </div>
        <div>
          <div className="text-[10px] text-dim-gray font-mono">ROI</div>
          <div className={cn("mt-1 text-base font-bold font-mono", trader.roi > 0 ? "text-neon-green" : "text-neon-red")}>{trader.roi > 0 ? '+' : ''}{trader.roi}%</div>
        </div>
        <div>
          <div className="text-[10px] text-dim-gray font-mono">总盈利</div>
          <div className="mt-1 text-base font-bold text-foreground font-mono">${formatNumber(trader.totalProfit)}</div>
        </div>
      </div>

      {/* 模拟跟单盈亏 */}
      <div className="mb-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 p-3">
        <div className="mb-2 text-xs font-medium text-neon-cyan">📊 模拟跟单表现</div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <div className="text-dim-gray">已投入</div>
            <div className="mt-0.5 font-medium text-foreground font-mono">${formatNumber(simulated.invested)}</div>
          </div>
          <div>
            <div className="text-dim-gray">模拟盈亏</div>
            <div className={cn("mt-0.5 font-medium font-mono", simulated.pnl > 0 ? "text-neon-green" : "text-neon-red")}>
              {simulated.pnl > 0 ? '+' : ''}${formatNumber(simulated.pnl)}
            </div>
          </div>
          <div>
            <div className="text-dim-gray">跟单次数</div>
            <div className="mt-0.5 font-medium text-foreground font-mono">{simulated.trades}笔</div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-dim-gray">
          虚拟本金: ${formatNumber(config.virtualCapital)} | 跟单比例: {config.copyRatio}%
        </div>
      </div>

      {/* 跟单配置 */}
      <div className="mb-4">
        <button onClick={() => setShowSettings(!showSettings)} className="flex w-full items-center justify-between rounded-lg bg-cyber-darker border border-cyber-border p-2.5 text-xs font-medium text-dim-white hover:border-neon-cyan/30 transition-all">
          <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> 跟单配置</span>
          <span>{showSettings ? '▲' : '▼'}</span>
        </button>

        {showSettings && (
          <div className="mt-2 space-y-3 rounded-lg bg-cyber-darker border border-cyber-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dim-white">启用跟单</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={config.enabled} onChange={(e) => handleConfigChange({ enabled: e.target.checked })} className="peer sr-only" />
                <div className="peer h-5 w-9 rounded-full bg-cyber-border after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-dim-gray after:transition-all peer-checked:bg-neon-cyan peer-checked:after:translate-x-full peer-checked:after:bg-cyber-black"></div>
              </label>
            </div>
            {config.enabled && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] text-dim-gray font-mono">虚拟本金: ${config.virtualCapital}</label>
                  <input type="range" min="1000" max="50000" step="1000" value={config.virtualCapital} onChange={(e) => handleConfigChange({ virtualCapital: parseInt(e.target.value) })} className="w-full accent-neon-cyan" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-dim-gray font-mono">跟单比例: {config.copyRatio}%</label>
                  <input type="range" min="10" max="100" step="5" value={config.copyRatio} onChange={(e) => handleConfigChange({ copyRatio: parseInt(e.target.value) })} className="w-full accent-neon-cyan" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-dim-gray font-mono">单笔最大额</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dim-gray">$</span>
                    <input type="number" value={config.maxPerTrade} onChange={(e) => handleConfigChange({ maxPerTrade: parseInt(e.target.value) })} className="flex-1 rounded-lg bg-cyber-black border border-cyber-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-neon-cyan/50" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/traders/${trader.address}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-cyber-darker border border-cyber-border py-2 text-xs font-medium text-dim-white hover:border-neon-cyan/30 transition-all">
          <Eye className="w-3.5 h-3.5" /> 详情
        </Link>
        <button onClick={onUnfollow} className="rounded-lg bg-neon-red/20 border border-neon-red/30 px-3 py-2 text-xs font-medium text-neon-red hover:bg-neon-red/30 transition-all">
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// 最近动态组件 - 使用真实交易数据
function RecentActivityFeed({ trades }: { trades: any[] }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center text-xs text-dim-gray py-6">暂无最近动态</div>
    )
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {trades.slice(0, 10).map((trade, i) => (
        <div key={`${trade.tx_hash}-${i}`} className="rounded-lg bg-cyber-darker border border-cyber-border p-3 hover:border-neon-cyan/30 transition-all">
          <div className="flex items-start gap-2">
            <span className="text-lg">{trade.side === 'BUY' ? '💰' : '💸'}</span>
            <div className="flex-1">
              <p className="text-xs text-dim-white">
                <Link href={`/traders/${trade.maker}`} className="font-mono font-medium text-foreground hover:text-neon-cyan">
                  {trade.maker?.slice(0, 6)}...{trade.maker?.slice(-4)}
                </Link>{' '}
                <span className={trade.side === 'BUY' ? 'text-neon-green' : 'text-neon-red'}>
                  {trade.side === 'BUY' ? '买入' : '卖出'}
                </span>{' '}
                "{trade.market_slug}" ${formatNumber(trade.amount_usd)} @{trade.price?.toFixed(2)}
              </p>
              <div className="mt-1 text-[10px] text-dim-gray font-mono" suppressHydrationWarning>
                {formatTimeAgo(new Date(trade.timestamp))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FollowingPage() {
  const hasMounted = useHasMounted()
  const [filter, setFilter] = useState<'all' | 'active' | 'warning' | 'paused'>('all')

  // 真实数据: 关注列表 (localStorage)
  const { followedTraders, followedAddresses, isLoaded, unfollow, updateConfig, getConfig, count } = useFollowing()

  // 真实数据: 交易员数据 (API)
  const { data: tradersData, isLoading: tradersLoading } = useTradersLeaderboard({ limit: 100, min_trades: 3 })
  const allTraders = getTradersWithFallback(tradersData?.data)

  // 真实数据: 最近大单交易 (API)
  const { data: whalesData, isLoading: whalesLoading } = useWhalesLive({ limit: 20 })

  // 匹配关注的交易员与真实数据
  const followedTradersWithData = useMemo(() => {
    return followedAddresses.map((address) => {
      const traderData = allTraders.find((t) => t.address.toLowerCase() === address.toLowerCase())
      const config = getConfig(address)
      return { address, trader: traderData, config }
    }).filter((t) => t.trader && t.config) as { address: string; trader: TraderProfile; config: FollowConfig }[]
  }, [followedAddresses, allTraders, getConfig])

  // 计算总览数据 (模拟盈亏)
  const overview = useMemo(() => {
    let totalInvested = 0
    let totalPnL = 0

    followedTradersWithData.forEach(({ trader, config }) => {
      const simulated = calculateSimulatedPnL(trader.roi, config)
      totalInvested += simulated.invested
      totalPnL += simulated.pnl
    })

    const activeCount = followedTradersWithData.filter((t) => t.trader.recentPerformance.status === 'good').length

    return {
      totalFollowed: count,
      activeFollowed: activeCount,
      totalInvested,
      totalPnL,
      todayActivities: whalesData?.data?.length || 0,
    }
  }, [followedTradersWithData, count, whalesData])

  // 筛选
  const filteredTraders = followedTradersWithData.filter(({ trader }) => {
    if (filter === 'all') return true
    if (filter === 'active') return trader.recentPerformance.status === 'good'
    if (filter === 'warning') return trader.recentPerformance.status !== 'good'
    return true
  })

  const isLoading = !isLoaded || tradersLoading

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Star className="w-6 h-6 text-neon-cyan" />
          My Following
          {hasMounted && <span className="text-lg text-dim-gray">({overview.totalFollowed})</span>}
        </h1>
        <p className="text-[10px] text-dim-gray mt-1 font-mono">// Track your copied homework performance</p>
      </div>

      {/* 快速筛选 */}
      <div className="flex gap-1.5">
        {[
          { value: 'all' as const, label: '全部', count: overview.totalFollowed },
          { value: 'active' as const, label: '活跃', count: overview.activeFollowed },
          { value: 'warning' as const, label: '警示', count: overview.totalFollowed - overview.activeFollowed },
          { value: 'paused' as const, label: '已暂停', count: 0 },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              filter === f.value
                ? "bg-neon-cyan text-cyber-black"
                : "bg-cyber-darker text-dim-white border border-cyber-border hover:border-neon-cyan/30"
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* A. 跟单总览 - 模拟盈亏 */}
        <div className="cyber-card p-5">
          <h3 className="mb-4 text-base font-bold gradient-text">📊 跟单总览</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-dim-gray font-mono">关注</div>
              <div className="mt-1 text-xl font-bold text-foreground font-mono">{overview.totalFollowed}</div>
              <div className="text-[10px] text-dim-gray font-mono">活跃: {overview.activeFollowed}</div>
            </div>
            <div>
              <div className="text-[10px] text-dim-gray font-mono">模拟投入</div>
              <div className="mt-1 text-xl font-bold text-foreground font-mono">${formatNumber(overview.totalInvested)}</div>
            </div>
            <div>
              <div className="text-[10px] text-dim-gray font-mono">模拟盈亏</div>
              <div className={cn("mt-1 text-xl font-bold font-mono", overview.totalPnL > 0 ? "text-neon-green" : "text-neon-red")}>
                {overview.totalPnL > 0 ? '+' : ''}${formatNumber(overview.totalPnL)}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-cyber-darker border border-cyber-border p-3">
            <span className="text-xs text-dim-white">今日大单动态</span>
            <span className="text-base font-bold text-neon-cyan font-mono">{overview.todayActivities} 条</span>
          </div>
          <div className="mt-3 text-[10px] text-dim-gray text-center">
            💡 盈亏 = Σ(交易员ROI × 虚拟本金 × 跟单比例)
          </div>
        </div>

        {/* B. 最近动态 - 真实交易数据 */}
        <div className="lg:col-span-2 cyber-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold gradient-text">🔔 最近动态</h3>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-neon-green pulse-dot"></div>
              <span className="text-[10px] text-dim-gray font-mono">
                {whalesLoading ? '加载中...' : '实时更新'}
              </span>
            </div>
          </div>
          <RecentActivityFeed trades={whalesData?.data || []} />
        </div>
      </div>

      {/* C. 关注的交易者列表 - 真实数据 */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">📋 我关注的交易者</h2>
          <Link href="/traders" className="flex items-center gap-1.5 text-xs text-neon-cyan hover:text-neon-green transition-all">
            <UserPlus className="w-3.5 h-3.5" />
            添加更多
          </Link>
        </div>

        {filteredTraders.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTraders.map(({ address, trader, config }) => (
              <FollowedTraderCard
                key={address}
                trader={trader}
                followConfig={config}
                onUpdateConfig={(newConfig) => updateConfig(address, newConfig)}
                onUnfollow={() => unfollow(address)}
              />
            ))}
          </div>
        ) : (
          <div className="cyber-card p-10 text-center">
            <div className="text-4xl mb-4">🐋</div>
            <h3 className="text-lg font-bold text-foreground mb-2">还没有关注任何交易员</h3>
            <p className="text-sm text-dim-gray mb-4">去交易员页面发现聪明钱，开始抄作业吧！</p>
            <Link href="/traders" className="inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-medium text-cyber-black hover:bg-neon-green transition-all">
              <UserPlus className="w-4 h-4" />
              发现交易员
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
