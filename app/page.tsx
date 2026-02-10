'use client'

import { useState, useEffect, useCallback } from 'react'
import { callAIAgent, extractText } from '@/lib/aiAgent'
import {
  getSchedule,
  getScheduleLogs,
  pauseSchedule,
  resumeSchedule,
  triggerScheduleNow,
  cronToHuman,
  type Schedule,
  type ExecutionLog,
} from '@/lib/scheduler'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  X,
  RefreshCw,
  Check,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Copy,
  Plus,
  Search,
  Settings,
  ArrowRight,
  Download,
  FileText,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const AGENT_ID = '698ba6ee0ef7203b23a43d68'
const SCHEDULE_ID = '698ba9a4ebe6fd87d1dcc0e0'

const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']

const LS_WATCHLIST = 'stock_watchlist'
const LS_EMAIL = 'stock_email_settings'
const LS_HISTORY = 'stock_analysis_history'

// ============================================================================
// Types
// ============================================================================

interface AnalysisEntry {
  id: string
  timestamp: string
  watchlist: string[]
  text: string
}

interface EmailSettings {
  email: string
  enabled: boolean
}

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_ANALYSIS_TEXT = `### Morning Briefing Report

**Date:** February 10, 2026

---

#### Executive Summary
The stock market is exhibiting mixed sentiment ahead of today's trading session. Tech stocks show resilience with AAPL and MSFT posting modest gains, while TSLA faces headwinds from recent regulatory concerns. Overall market sentiment leans cautiously optimistic following strong employment data released last week.

---

#### Individual Stock Analysis

**1. Apple Inc. (AAPL)**
   - **Current Price:** $198.52
   - **Daily Change:** +$2.34 (+1.19%)
   - **Trading Volume:** 48.2M
   - **52-Week Range:** $164.08 - $210.73
   - **Recent News:**
     - Apple announces expanded AI features for iPhone 17 lineup
     - Services revenue hits record $25.3B in Q1 2026
   - **Analyst Ratings/Consensus:** Buy (avg target: $215.00)
   - **Technical Indicators:**
     - **RSI:** 58.3 (neutral)
     - **MACD:** Bullish crossover
     - **50-Day Moving Average:** $192.40
     - **200-Day Moving Average:** $185.20

---

**2. Microsoft Corp. (MSFT)**
   - **Current Price:** $442.18
   - **Daily Change:** +$5.67 (+1.30%)
   - **Trading Volume:** 22.1M
   - **52-Week Range:** $380.15 - $468.90
   - **Recent News:**
     - Azure revenue grows 32% YoY, exceeding analyst expectations
     - New Copilot enterprise tier launches globally
   - **Analyst Ratings/Consensus:** Strong Buy (avg target: $480.00)
   - **Technical Indicators:**
     - **RSI:** 62.1 (slightly overbought)
     - **MACD:** Bullish
     - **50-Day Moving Average:** $428.50
     - **200-Day Moving Average:** $410.30

---

**3. Alphabet Inc. (GOOGL)**
   - **Current Price:** $178.94
   - **Daily Change:** -$0.82 (-0.46%)
   - **Trading Volume:** 28.5M
   - **52-Week Range:** $142.50 - $195.20
   - **Recent News:**
     - Gemini 3.0 launch drives cloud adoption
     - DOJ antitrust ruling expected next month
   - **Analyst Ratings/Consensus:** Buy (avg target: $195.00)
   - **Technical Indicators:**
     - **RSI:** 45.8 (neutral)
     - **MACD:** Neutral
     - **50-Day Moving Average:** $175.60
     - **200-Day Moving Average:** $168.40

---

**4. Amazon.com Inc. (AMZN)**
   - **Current Price:** $215.30
   - **Daily Change:** +$3.12 (+1.47%)
   - **Trading Volume:** 35.8M
   - **52-Week Range:** $178.25 - $228.90
   - **Recent News:**
     - AWS launches new AI infrastructure services
     - Prime membership reaches 250M globally
   - **Analyst Ratings/Consensus:** Strong Buy (avg target: $240.00)
   - **Technical Indicators:**
     - **RSI:** 55.2 (neutral)
     - **MACD:** Bullish
     - **50-Day Moving Average:** $208.40
     - **200-Day Moving Average:** $198.70

---

**5. Tesla Inc. (TSLA)**
   - **Current Price:** $312.45
   - **Daily Change:** -$8.90 (-2.77%)
   - **Trading Volume:** 62.4M
   - **52-Week Range:** $215.60 - $385.20
   - **Recent News:**
     - Q4 delivery numbers miss estimates by 3%
     - FSD v13 rollout faces regulatory delays in Europe
   - **Analyst Ratings/Consensus:** Hold (avg target: $330.00)
   - **Technical Indicators:**
     - **RSI:** 38.5 (approaching oversold)
     - **MACD:** Bearish
     - **50-Day Moving Average:** $335.20
     - **200-Day Moving Average:** $310.50

---

#### Market Overview
Today, the broader market indices such as the S&P 500 (+0.45%) and NASDAQ (+0.62%) are reflecting cautiously bullish trends following strong jobs data and easing inflation concerns. Investors are watching the Fed's next policy meeting closely.

---

#### Key Risks & Opportunities
- **Risks:**
  - Potential rate hike if inflation rebounds above 3%
  - Geopolitical tensions affecting semiconductor supply chains
  - Regulatory scrutiny on Big Tech AI practices
- **Opportunities:**
  - AI infrastructure spending continues to accelerate
  - Cloud computing growth remains robust across major providers
  - Consumer spending resilience supports retail and services sectors

---

**Data Sources:** Yahoo Finance, Bloomberg, Reuters, SEC Filings
**Timestamp:** 7:00 AM EST`

const SAMPLE_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: 198.52, change: 2.34, changePct: 1.19 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', price: 442.18, change: 5.67, changePct: 1.30 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 178.94, change: -0.82, changePct: -0.46 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 215.30, change: 3.12, changePct: 1.47 },
  { ticker: 'TSLA', name: 'Tesla Inc.', price: 312.45, change: -8.90, changePct: -2.77 },
]

// ============================================================================
// Markdown Renderer
// ============================================================================

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('#### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-4 mb-1 text-[hsl(220,20%,15%)]">
              {formatInline(line.slice(5))}
            </h4>
          )
        if (line.startsWith('### '))
          return (
            <h3 key={i} className="font-semibold text-base mt-4 mb-1 text-[hsl(220,20%,15%)]">
              {formatInline(line.slice(4))}
            </h3>
          )
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="font-bold text-lg mt-5 mb-2 text-[hsl(220,20%,15%)]">
              {formatInline(line.slice(3))}
            </h2>
          )
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="font-bold text-xl mt-5 mb-2 text-[hsl(220,20%,15%)]">
              {formatInline(line.slice(2))}
            </h1>
          )
        if (line.trim() === '---')
          return <Separator key={i} className="my-3" />
        if (line.startsWith('   - ') || line.startsWith('  - '))
          return (
            <li key={i} className="ml-8 list-disc text-sm leading-relaxed text-[hsl(220,12%,35%)]">
              {formatInline(line.replace(/^\s*-\s*/, ''))}
            </li>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-[hsl(220,12%,35%)]">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed text-[hsl(220,12%,35%)]">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed text-[hsl(220,12%,35%)]">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ============================================================================
// Stock Card Component
// ============================================================================

function StockCard({ ticker, name, price, change, changePct }: {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
}) {
  const isPositive = change >= 0
  return (
    <div className="bg-white border border-[hsl(220,15%,88%)] rounded-sm p-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-semibold text-sm text-[hsl(220,20%,15%)]">{ticker}</span>
          <span className="text-xs text-[hsl(220,12%,50%)] ml-1">{name}</span>
        </div>
        <span className={isPositive ? 'text-[hsl(160,65%,40%)] text-sm font-medium' : 'text-[hsl(0,70%,50%)] text-sm font-medium'}>
          {isPositive ? '+' : ''}{changePct.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-lg font-semibold text-[hsl(220,20%,15%)]">${price.toFixed(2)}</div>
        <div className={isPositive ? 'text-xs text-[hsl(160,65%,40%)]' : 'text-xs text-[hsl(0,70%,50%)]'}>
          {isPositive ? '+' : ''}{change.toFixed(2)}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {[...Array(7)].map((_, idx) => {
          const h = isPositive
            ? 4 + Math.abs(Math.sin((idx + change) * 1.2)) * 12
            : 4 + Math.abs(Math.cos((idx + change) * 0.9)) * 12
          return (
            <div
              key={idx}
              className={isPositive ? 'bg-[hsl(160,65%,40%)]/30 rounded-sm flex-1' : 'bg-[hsl(0,70%,50%)]/30 rounded-sm flex-1'}
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function Home() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sampleData, setSampleData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Watchlist
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [newTicker, setNewTicker] = useState('')

  // Email settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({ email: 'vidur@lyzr.ai', enabled: true })

  // Analysis
  const [latestAnalysis, setLatestAnalysis] = useState<string>('')
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<AnalysisEntry | null>(null)
  const [historyFilter, setHistoryFilter] = useState('')

  // Schedule
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [logsExpanded, setLogsExpanded] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)

  // Settings save feedback
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Copy feedback
  const [copied, setCopied] = useState(false)

  // Time display
  const [currentTime, setCurrentTime] = useState('')

  // --- Load from localStorage ---
  useEffect(() => {
    try {
      const savedWatchlist = localStorage.getItem(LS_WATCHLIST)
      if (savedWatchlist) {
        const parsed = JSON.parse(savedWatchlist)
        if (Array.isArray(parsed) && parsed.length > 0) setWatchlist(parsed)
      }
    } catch { /* ignore */ }

    try {
      const savedEmail = localStorage.getItem(LS_EMAIL)
      if (savedEmail) {
        const parsed = JSON.parse(savedEmail)
        if (parsed && typeof parsed === 'object') setEmailSettings(parsed)
      }
    } catch { /* ignore */ }

    try {
      const savedHistory = localStorage.getItem(LS_HISTORY)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) setAnalysisHistory(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // --- Clock ---
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString())
    const iv = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(iv)
  }, [])

  // --- Fetch schedule ---
  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const res = await getSchedule(SCHEDULE_ID)
      if (res.success && res.schedule) {
        setSchedule(res.schedule)
      } else {
        setScheduleError(res.error || 'Failed to load schedule')
      }
    } catch {
      setScheduleError('Failed to load schedule')
    }
    setScheduleLoading(false)
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await getScheduleLogs(SCHEDULE_ID, { limit: 10 })
      if (res.success) {
        setExecutionLogs(Array.isArray(res.executions) ? res.executions : [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchSchedule()
    fetchLogs()
  }, [fetchSchedule, fetchLogs])

  // --- Run Analysis ---
  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setStatusMsg('Running analysis... This may take 20-60 seconds.')
    setActiveAgentId(AGENT_ID)

    const tickers = watchlist.join(', ')
    const message = `Analyze the following stocks and provide a morning briefing report: ${tickers}. Include current price, daily change, key news, technical indicators, and market sentiment. Send the report via Gmail to vidur@lyzr.ai with subject "Morning Stock Briefing".`

    try {
      const result = await callAIAgent(message, AGENT_ID)
      let analysisText = ''
      if (result.success && result.response) {
        analysisText = extractText(result.response)
        if (!analysisText && result.raw_response) {
          analysisText = result.raw_response
        }
        if (!analysisText && result.response.result) {
          if (typeof result.response.result === 'string') {
            analysisText = result.response.result
          } else if (result.response.result?.raw_text) {
            analysisText = result.response.result.raw_text
          } else {
            analysisText = JSON.stringify(result.response.result, null, 2)
          }
        }
      } else {
        setError(result.error || result.response?.message || 'Analysis failed. Please try again.')
      }

      if (analysisText) {
        setLatestAnalysis(analysisText)
        const entry: AnalysisEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          watchlist: [...watchlist],
          text: analysisText,
        }
        const updatedHistory = [entry, ...analysisHistory]
        setAnalysisHistory(updatedHistory)
        try {
          localStorage.setItem(LS_HISTORY, JSON.stringify(updatedHistory.slice(0, 50)))
        } catch { /* ignore */ }
        setStatusMsg('Analysis complete.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }

    setLoading(false)
    setActiveAgentId(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  // --- Schedule actions ---
  const handleToggleSchedule = async () => {
    if (!schedule) return
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const res = schedule.is_active
        ? await pauseSchedule(SCHEDULE_ID)
        : await resumeSchedule(SCHEDULE_ID)
      if (res.success) {
        setScheduleMsg(schedule.is_active ? 'Schedule paused.' : 'Schedule resumed.')
        await fetchSchedule()
      } else {
        setScheduleError(res.error || 'Failed to toggle schedule')
      }
    } catch {
      setScheduleError('Failed to toggle schedule')
    }
    setScheduleLoading(false)
    setTimeout(() => setScheduleMsg(null), 3000)
  }

  const handleTriggerNow = async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const res = await triggerScheduleNow(SCHEDULE_ID)
      if (res.success) {
        setScheduleMsg('Schedule triggered. Analysis will run shortly.')
      } else {
        setScheduleError(res.error || 'Failed to trigger schedule')
      }
    } catch {
      setScheduleError('Failed to trigger schedule')
    }
    setScheduleLoading(false)
    setTimeout(() => setScheduleMsg(null), 4000)
  }

  // --- Watchlist ---
  const addTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !watchlist.includes(t)) {
      setWatchlist(prev => [...prev, t])
      setNewTicker('')
    }
  }

  const removeTicker = (ticker: string) => {
    setWatchlist(prev => prev.filter(t => t !== ticker))
  }

  // --- Settings save ---
  const saveSettings = () => {
    try {
      localStorage.setItem(LS_WATCHLIST, JSON.stringify(watchlist))
      localStorage.setItem(LS_EMAIL, JSON.stringify(emailSettings))
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch { /* ignore */ }
  }

  // --- Copy analysis ---
  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // --- History filtering ---
  const filteredHistory = analysisHistory.filter(entry => {
    if (!historyFilter) return true
    const d = new Date(entry.timestamp)
    const dateStr = d.toLocaleDateString()
    return dateStr.includes(historyFilter) || entry.watchlist.some(t => t.toLowerCase().includes(historyFilter.toLowerCase()))
  })

  // --- Derived display data ---
  const displayText = sampleData && !latestAnalysis ? SAMPLE_ANALYSIS_TEXT : latestAnalysis
  const displayStocks = sampleData ? SAMPLE_STOCKS : []
  const displayHistory = sampleData && analysisHistory.length === 0
    ? [
        { id: 'sample-1', timestamp: '2026-02-10T07:00:00.000Z', watchlist: DEFAULT_WATCHLIST, text: SAMPLE_ANALYSIS_TEXT },
        { id: 'sample-2', timestamp: '2026-02-09T07:00:00.000Z', watchlist: ['AAPL', 'MSFT', 'GOOGL'], text: '### Morning Briefing Report\n\n**Date:** February 9, 2026\n\n---\n\nMarkets opened higher with tech stocks leading gains. AAPL rose 0.8% on strong iPhone demand data. MSFT climbed 1.2% after Azure partnership announcement. GOOGL was flat amid regulatory uncertainty.' },
        { id: 'sample-3', timestamp: '2026-02-08T07:00:00.000Z', watchlist: DEFAULT_WATCHLIST, text: '### Morning Briefing Report\n\n**Date:** February 8, 2026\n\n---\n\nBroad market selloff on Friday. All five watchlist stocks declined. TSLA led losses at -3.5% on delivery miss concerns. AMZN held relatively steady at -0.3%.' },
      ]
    : filteredHistory

  const totalValue = sampleData ? SAMPLE_STOCKS.reduce((s, st) => s + st.price, 0) : 0
  const dailyChangePct = sampleData
    ? SAMPLE_STOCKS.reduce((s, st) => s + st.changePct, 0) / SAMPLE_STOCKS.length
    : 0

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[hsl(220,15%,97%)] text-[hsl(220,20%,15%)] font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[hsl(220,15%,88%)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[hsl(220,75%,50%)]" />
            <span className="font-semibold text-sm tracking-normal">Stock Analysis Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-[hsl(220,12%,50%)]">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleData}
                onCheckedChange={setSampleData}
              />
            </div>
            <span className="text-xs text-[hsl(220,12%,50%)]">{currentTime}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-[hsl(220,12%,92%)] rounded-sm">
            <TabsTrigger value="dashboard" className="text-xs rounded-sm data-[state=active]:bg-[hsl(220,75%,50%)] data-[state=active]:text-white">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs rounded-sm data-[state=active]:bg-[hsl(220,75%,50%)] data-[state=active]:text-white">
              Analysis History
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs rounded-sm data-[state=active]:bg-[hsl(220,75%,50%)] data-[state=active]:text-white">
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* TAB 1: DASHBOARD                                                  */}
          {/* ================================================================ */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Status / error messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[hsl(0,70%,97%)] border border-[hsl(0,70%,85%)] rounded-sm text-sm text-[hsl(0,70%,50%)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
              </div>
            )}
            {statusMsg && (
              <div className="flex items-center gap-2 p-3 bg-[hsl(220,75%,97%)] border border-[hsl(220,75%,85%)] rounded-sm text-sm text-[hsl(220,75%,50%)]">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardContent className="p-3">
                  <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Portfolio Summary</p>
                  {sampleData ? (
                    <>
                      <p className="text-2xl font-semibold">${totalValue.toFixed(2)}</p>
                      <p className={dailyChangePct >= 0 ? 'text-xs text-[hsl(160,65%,40%)]' : 'text-xs text-[hsl(0,70%,50%)]'}>
                        {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}% avg daily change
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[hsl(220,12%,50%)]">Run analysis to see portfolio data</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardContent className="p-3">
                  <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Watchlist</p>
                  <div className="flex flex-wrap gap-1">
                    {watchlist.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs bg-[hsl(220,12%,92%)] text-[hsl(220,20%,15%)] rounded-sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardContent className="p-3">
                  <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Next Scheduled Analysis</p>
                  {schedule?.next_run_time ? (
                    <p className="text-sm font-medium">{new Date(schedule.next_run_time).toLocaleString()}</p>
                  ) : (
                    <p className="text-sm text-[hsl(220,12%,50%)]">
                      {schedule ? (schedule.is_active ? 'Calculating...' : 'Schedule paused') : 'Loading...'}
                    </p>
                  )}
                  {schedule?.cron_expression && (
                    <p className="text-xs text-[hsl(220,12%,50%)] mt-1">{cronToHuman(schedule.cron_expression)}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Run Analysis Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={runAnalysis}
                disabled={loading}
                className="bg-[hsl(220,75%,50%)] hover:bg-[hsl(220,75%,45%)] text-white rounded-sm shadow-none"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Analyzing...' : 'Run Analysis Now'}
              </Button>
              {loading && (
                <span className="text-xs text-[hsl(220,12%,50%)]">
                  Perplexity analysis may take 20-60 seconds
                </span>
              )}
            </div>

            {/* Stock Cards Grid */}
            {displayStocks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Stock Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {displayStocks.map(s => (
                    <StockCard
                      key={s.ticker}
                      ticker={s.ticker}
                      name={s.name}
                      price={s.price}
                      change={s.change}
                      changePct={s.changePct}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Latest Analysis */}
            {displayText ? (
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Latest Analysis</CardTitle>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(displayText)}
                        className="text-[hsl(220,12%,50%)] hover:text-[hsl(220,20%,15%)] transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-[hsl(160,65%,40%)]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="max-h-[500px]">
                    {renderMarkdown(displayText)}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardContent className="p-8 text-center">
                  <FileText className="w-10 h-10 text-[hsl(220,12%,80%)] mx-auto mb-3" />
                  <p className="text-sm text-[hsl(220,12%,50%)]">No analysis yet.</p>
                  <p className="text-xs text-[hsl(220,12%,65%)] mt-1">
                    Click &quot;Run Analysis Now&quot; to generate a stock briefing, or enable Sample Data to preview.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB 2: ANALYSIS HISTORY                                           */}
          {/* ================================================================ */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(220,12%,50%)]" />
                <Input
                  placeholder="Filter by date or ticker..."
                  value={historyFilter}
                  onChange={e => setHistoryFilter(e.target.value)}
                  className="pl-9 h-8 text-sm border-[hsl(220,12%,82%)] rounded-sm shadow-none"
                />
              </div>
              <span className="text-xs text-[hsl(220,12%,50%)]">
                {displayHistory.length} report{displayHistory.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedEntry ? (
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Analysis Report
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {new Date(selectedEntry.timestamp).toLocaleString()} | {selectedEntry.watchlist.join(', ')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(selectedEntry.text)}
                        className="text-[hsl(220,12%,50%)] hover:text-[hsl(220,20%,15%)] transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-[hsl(160,65%,40%)]" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(null)}
                        className="text-xs h-7 rounded-sm"
                      >
                        <X className="w-3 h-3 mr-1" /> Close
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="max-h-[600px]">
                    {renderMarkdown(selectedEntry.text)}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : displayHistory.length > 0 ? (
              <div className="space-y-2">
                {displayHistory.map(entry => (
                  <Card
                    key={entry.id}
                    className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none cursor-pointer hover:border-[hsl(220,75%,50%)] transition-colors"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[hsl(220,20%,15%)]">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-[hsl(220,12%,50%)]">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            {Array.isArray(entry.watchlist) && entry.watchlist.map(t => (
                              <Badge key={t} variant="secondary" className="text-[10px] bg-[hsl(220,12%,92%)] rounded-sm px-1 py-0">
                                {t}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-[hsl(220,12%,50%)] truncate">
                            {entry.text.slice(0, 120).replace(/[#*\-]/g, '')}...
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[hsl(220,12%,70%)] flex-shrink-0 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
                <CardContent className="p-8 text-center">
                  <FileText className="w-10 h-10 text-[hsl(220,12%,80%)] mx-auto mb-3" />
                  <p className="text-sm text-[hsl(220,12%,50%)]">No analysis history yet.</p>
                  <p className="text-xs text-[hsl(220,12%,65%)] mt-1">
                    Run an analysis from the Dashboard tab to build your report history.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB 3: SETTINGS                                                   */}
          {/* ================================================================ */}
          <TabsContent value="settings" className="space-y-4">
            {/* Watchlist Manager */}
            <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Stock Watchlist</CardTitle>
                <CardDescription className="text-xs">Add or remove tickers from your watchlist. Default: AAPL, MSFT, GOOGL, AMZN, TSLA</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    placeholder="Enter ticker (e.g., NVDA)"
                    value={newTicker}
                    onChange={e => setNewTicker(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTicker()}
                    className="h-8 text-sm border-[hsl(220,12%,82%)] rounded-sm shadow-none flex-1 max-w-xs"
                  />
                  <Button
                    onClick={addTicker}
                    size="sm"
                    className="h-8 bg-[hsl(220,75%,50%)] hover:bg-[hsl(220,75%,45%)] text-white rounded-sm shadow-none"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchlist.map(t => (
                    <Badge key={t} variant="secondary" className="text-xs bg-[hsl(220,12%,92%)] text-[hsl(220,20%,15%)] rounded-sm pr-1">
                      {t}
                      <button
                        onClick={() => removeTicker(t)}
                        className="ml-1 hover:text-[hsl(0,70%,50%)] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Email Notifications</CardTitle>
                <CardDescription className="text-xs">Configure email delivery for morning briefing reports (via Gmail integration)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={emailSettings.email}
                    onChange={e => setEmailSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="h-8 text-sm border-[hsl(220,12%,82%)] rounded-sm shadow-none flex-1 max-w-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="email-toggle"
                    checked={emailSettings.enabled}
                    onCheckedChange={v => setEmailSettings(prev => ({ ...prev, enabled: v }))}
                  />
                  <Label htmlFor="email-toggle" className="text-xs text-[hsl(220,12%,50%)]">
                    Enable email notifications
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Settings */}
            <Card className="border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Schedule Settings</CardTitle>
                <CardDescription className="text-xs">Manage the automated daily analysis schedule</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                {scheduleError && (
                  <div className="flex items-center gap-2 p-2 bg-[hsl(0,70%,97%)] border border-[hsl(0,70%,85%)] rounded-sm text-xs text-[hsl(0,70%,50%)]">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{scheduleError}</span>
                  </div>
                )}
                {scheduleMsg && (
                  <div className="flex items-center gap-2 p-2 bg-[hsl(160,65%,95%)] border border-[hsl(160,65%,80%)] rounded-sm text-xs text-[hsl(160,65%,35%)]">
                    <Check className="w-3 h-3 flex-shrink-0" />
                    <span>{scheduleMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Cron Expression</p>
                    <p className="text-sm font-medium">
                      {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Loading...'}
                    </p>
                    <p className="text-xs text-[hsl(220,12%,65%)] mt-0.5">
                      {schedule?.cron_expression || '33 3 * * *'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Timezone</p>
                    <p className="text-sm font-medium">{schedule?.timezone || 'Asia/Kolkata'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Status</p>
                    <Badge
                      variant={schedule?.is_active ? 'default' : 'secondary'}
                      className={schedule?.is_active ? 'text-xs bg-[hsl(160,65%,40%)] text-white rounded-sm' : 'text-xs bg-[hsl(220,12%,92%)] text-[hsl(220,12%,50%)] rounded-sm'}
                    >
                      {schedule?.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Next Run</p>
                    <p className="text-sm font-medium">
                      {schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(220,12%,50%)] mb-1">Last Run</p>
                    <p className="text-sm font-medium">
                      {schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}
                    </p>
                    {schedule?.last_run_success !== null && schedule?.last_run_success !== undefined && (
                      <Badge
                        variant={schedule.last_run_success ? 'default' : 'destructive'}
                        className={schedule.last_run_success ? 'text-[10px] bg-[hsl(160,65%,40%)] text-white rounded-sm mt-0.5' : 'text-[10px] bg-[hsl(0,70%,50%)] text-white rounded-sm mt-0.5'}
                      >
                        {schedule.last_run_success ? 'Success' : 'Failed'}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleToggleSchedule}
                    disabled={scheduleLoading || !schedule}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-sm shadow-none border-[hsl(220,12%,82%)]"
                  >
                    {scheduleLoading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : schedule?.is_active ? (
                      <>
                        <X className="w-3 h-3 mr-1" /> Pause
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" /> Resume
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleTriggerNow}
                    disabled={scheduleLoading}
                    size="sm"
                    className="h-8 text-xs bg-[hsl(220,75%,50%)] hover:bg-[hsl(220,75%,45%)] text-white rounded-sm shadow-none"
                  >
                    {scheduleLoading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3 mr-1" />
                    )}
                    Trigger Now
                  </Button>
                  <Button
                    onClick={() => { fetchSchedule(); fetchLogs() }}
                    disabled={scheduleLoading}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-sm"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${scheduleLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Execution Logs */}
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-[hsl(220,12%,50%)] hover:text-[hsl(220,20%,15%)] transition-colors"
                    onClick={() => setLogsExpanded(!logsExpanded)}
                  >
                    {logsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Execution Logs ({executionLogs.length})
                  </button>
                  {logsExpanded && (
                    <div className="mt-2 space-y-1">
                      {executionLogs.length > 0 ? (
                        <ScrollArea className="max-h-[200px]">
                          {executionLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-[hsl(220,15%,93%)] last:border-0">
                              <Badge
                                variant={log.success ? 'default' : 'destructive'}
                                className={log.success ? 'text-[10px] bg-[hsl(160,65%,40%)] text-white rounded-sm' : 'text-[10px] bg-[hsl(0,70%,50%)] text-white rounded-sm'}
                              >
                                {log.success ? 'OK' : 'ERR'}
                              </Badge>
                              <span className="text-xs text-[hsl(220,12%,50%)]">
                                {new Date(log.executed_at).toLocaleString()}
                              </span>
                              <span className="text-xs text-[hsl(220,12%,65%)]">
                                Attempt {log.attempt}/{log.max_attempts}
                              </span>
                              {log.error_message && (
                                <span className="text-xs text-[hsl(0,70%,50%)] truncate max-w-[200px]">
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                          ))}
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-[hsl(220,12%,65%)] py-2">No execution logs found.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={saveSettings}
                className="bg-[hsl(220,75%,50%)] hover:bg-[hsl(220,75%,45%)] text-white rounded-sm shadow-none"
              >
                {settingsSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Saved
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Save Settings
                  </>
                )}
              </Button>
              {settingsSaved && (
                <span className="text-xs text-[hsl(160,65%,40%)]">Settings saved to local storage.</span>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Agent Info Card */}
        <Card className="mt-6 border border-[hsl(220,15%,88%)] rounded-sm shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[hsl(160,65%,40%)]" />
                <div>
                  <p className="text-xs font-medium">Stock Analysis Agent</p>
                  <p className="text-[10px] text-[hsl(220,12%,50%)]">Perplexity sonar-reasoning-pro | Gmail integration | ID: {AGENT_ID.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeAgentId && (
                  <Badge className="text-[10px] bg-[hsl(220,75%,50%)] text-white rounded-sm animate-pulse">
                    Processing
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] bg-[hsl(220,12%,92%)] rounded-sm">
                  {schedule?.is_active ? 'Scheduled' : 'Manual'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
