// Data adapter - transforms API data to frontend format with mock fallback

import { formatAddress } from '../utils'
import type {
  WhaleTrade,
  MarketData,
  TraderLeaderboardEntry,
  TraderDetailResponse,
  AITraderProfile,
  InsiderAlert
} from './types'
import type { Market, TraderProfile, Alert } from '../mock-data'
import { mockMarkets, mockTraders, mockAlerts, mockTrades, mockSentimentData } from '../mock-data'

// ==================== Market Adapter ====================

export function apiMarketToFrontend(apiMarket: MarketData, index: number = 0): Market {
  // Generate price data from slug or use defaults
  const basePrice = 0.45 + (index * 0.05) % 0.5
  const priceChange = (Math.random() - 0.5) * 20

  return {
    id: index + 1,
    slug: apiMarket.slug,
    title: apiMarket.question,
    category: apiMarket.category?.includes('politic') ? 'politics' : 'geopolitics',
    subcategory: apiMarket.category || '国际政治',
    currentPrice: basePrice,
    priceChange24h: priceChange,
    volume24h: 100000 + Math.random() * 1000000,
    liquidity: 50 + Math.random() * 50,
    status: apiMarket.active ? 'active' : apiMarket.resolved ? 'resolved' : 'closed',
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    yesPrice: basePrice,
    noPrice: 1 - basePrice,
    priceHistory7d: Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
      price: basePrice + (Math.random() - 0.5) * 0.1,
    })),
  }
}

export function getMarketsWithFallback(apiData: MarketData[] | null | undefined): Market[] {
  if (!apiData || apiData.length === 0) {
    return mockMarkets
  }
  return apiData.map((m, i) => apiMarketToFrontend(m, i))
}

// ==================== Trader Adapter ====================

const TRADER_TAGS: Record<string, string[]> = {
  'smart_money': ['聪明钱', '神算子'],
  'dumb_money': ['反向指标'],
  'normal': ['中坚力量'],
}

export function apiTraderToFrontend(trader: TraderLeaderboardEntry | TraderDetailResponse, index: number = 0): TraderProfile {
  const tags = TRADER_TAGS[trader.trader_type] || ['中坚力量']
  if (trader.total_volume > 100000) {
    tags.unshift('巨鲸')
  }

  const winRate = trader.win_rate * 100 // API returns 0-1, we need 0-100
  const roi = winRate > 60 ? (winRate - 50) * 3 : -(60 - winRate) * 2

  return {
    address: trader.address,
    shortAddress: formatAddress(trader.address),
    tags,
    winRate: Math.round(winRate),
    winRate7d: Math.round(winRate + (Math.random() - 0.5) * 10),
    winRate30d: Math.round(winRate + (Math.random() - 0.5) * 5),
    roi: Math.round(roi),
    totalProfit: Math.round(trader.total_volume * (roi / 100)),
    totalTrades: trader.total_trades,
    totalVolume: trader.total_volume,
    expertise: [
      { category: '国际政治', winRate: Math.round(winRate + (Math.random() - 0.5) * 15), trades: Math.round(trader.total_trades * 0.6) },
      { category: '地缘政治', winRate: Math.round(winRate + (Math.random() - 0.5) * 15), trades: Math.round(trader.total_trades * 0.4) },
    ],
    recentPerformance: {
      period: '7d',
      status: winRate >= 60 ? 'good' : winRate >= 40 ? 'warning' : 'bad',
      message: winRate >= 60 ? '近期表现优秀' : winRate >= 40 ? '表现稳定' : '连续亏损中',
    },
    aiReview: (trader as any).ai_profile?.ai_analysis ||
      `该交易者胜率${Math.round(winRate)}%，${trader.trader_type === 'smart_money' ? '属于聪明钱类型，建议跟单' : trader.trader_type === 'dumb_money' ? '反向指标，建议反向操作' : '表现稳定'}。`,
    lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    joinedAt: new Date(Date.now() - (90 + Math.random() * 365) * 24 * 60 * 60 * 1000),
  }
}

export function getTradersWithFallback(apiData: TraderLeaderboardEntry[] | null | undefined): TraderProfile[] {
  if (!apiData || apiData.length === 0) {
    return mockTraders
  }
  return apiData.map((t, i) => apiTraderToFrontend(t, i))
}

// ==================== AI Trader Adapter ====================

export function apiAITraderToFrontend(trader: AITraderProfile, index: number = 0): TraderProfile {
  const base = apiTraderToFrontend(trader as any, index)

  // Add AI-specific tags
  if (trader.label) {
    base.tags.push(trader.label)
  }

  // Override AI review with actual AI analysis
  base.aiReview = trader.ai_analysis || base.aiReview

  return base
}

// ==================== Whale Trade to Alert Adapter ====================

export function whaleTradeToAlert(trade: WhaleTrade, index: number): Alert {
  const isBuy = trade.side === 'BUY'

  return {
    id: trade.tx_hash.slice(0, 10),
    type: 'whale_trade',
    icon: '🐋',
    message: `${formatAddress(trade.maker)} ${isBuy ? '买入' : '卖出'} "${trade.market_slug}" $${Math.round(trade.amount_usd).toLocaleString()} @${trade.price.toFixed(2)}`,
    timestamp: new Date(trade.timestamp),
    link: `/traders/${trade.maker}`,
  }
}

export function getAlertsWithFallback(whales: WhaleTrade[] | null | undefined): Alert[] {
  if (!whales || whales.length === 0) {
    return mockAlerts
  }
  return whales.slice(0, 10).map((w, i) => whaleTradeToAlert(w, i))
}

// ==================== Insider Alert Adapter ====================

export function insiderAlertToFrontendAlert(alert: InsiderAlert): Alert {
  return {
    id: String(alert.id),
    type: alert.is_suspect ? 'whale_trade' : 'market_surge',
    icon: alert.is_suspect ? '🚨' : '📊',
    message: `${formatAddress(alert.maker)} 在相关新闻前${alert.time_diff_minutes}分钟交易 $${Math.round(alert.amount_usd).toLocaleString()} - ${alert.reason}`,
    timestamp: new Date(alert.created_at),
    link: `/markets/${alert.market_slug}`,
  }
}

// ==================== Trade Adapter ====================

export function whaleTradeToTrade(trade: WhaleTrade) {
  return {
    txHash: trade.tx_hash,
    maker: trade.maker,
    taker: trade.maker, // API doesn't provide taker
    outcome: trade.outcome,
    side: trade.side,
    price: trade.price,
    size: trade.size,
    timestamp: new Date(trade.timestamp),
  }
}

export function getTradesWithFallback(whales: WhaleTrade[] | null | undefined) {
  if (!whales || whales.length === 0) {
    return mockTrades
  }
  return whales.map(whaleTradeToTrade)
}

// ==================== Sentiment Data (Mock only for now) ====================

export function getSentimentData() {
  return mockSentimentData
}

// ==================== Combined Data Provider ====================

export interface DashboardData {
  markets: Market[]
  traders: TraderProfile[]
  alerts: Alert[]
  trades: ReturnType<typeof whaleTradeToTrade>[]
  sentiment: typeof mockSentimentData
}

export function combineDashboardData(
  apiMarkets: MarketData[] | null | undefined,
  apiTraders: TraderLeaderboardEntry[] | null | undefined,
  apiWhales: WhaleTrade[] | null | undefined
): DashboardData {
  return {
    markets: getMarketsWithFallback(apiMarkets),
    traders: getTradersWithFallback(apiTraders),
    alerts: getAlertsWithFallback(apiWhales),
    trades: getTradesWithFallback(apiWhales),
    sentiment: getSentimentData(),
  }
}
