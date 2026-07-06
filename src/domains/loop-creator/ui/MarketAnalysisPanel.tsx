/**
 * Market Analysis Panel
 *
 * Displays market analysis results with save/regenerate capability.
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  X,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  Search,
  Save,
  RefreshCw,
  Check,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MarketAnalysisReport } from '../agents/market-analyst/types'
import { Node, Edge } from '@xyflow/react'

interface MarketAnalysisPanelProps {
  isOpen: boolean
  onClose: () => void
  nodes: Node[]
  edges: Edge[]
  gameLoopId: string | null
  gameContext: {
    gameGenre: string
    gamePlatform: string
    targetAudience: string
    gameDescription: string
  }
}

interface ProgressMessage {
  type: 'progress' | 'tool_call' | 'tool_result' | 'message' | 'report' | 'error'
  content: string
  timestamp: number
}

export function MarketAnalysisPanel({
  isOpen,
  onClose,
  nodes,
  edges,
  gameLoopId,
  gameContext,
}: MarketAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [report, setReport] = useState<MarketAnalysisReport | null>(null)
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load saved analysis when panel opens
  useEffect(() => {
    if (isOpen && gameLoopId) {
      loadSavedAnalysis()
    }
  }, [isOpen, gameLoopId])

  // Clear state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setProgressMessages([])
    }
  }, [isOpen])

  const loadSavedAnalysis = useCallback(async () => {
    if (!gameLoopId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`)
      const data = await response.json()

      if (response.ok && data.exists && data.analysis) {
        setReport(data.analysis)
        setSavedAt(new Date(data.metadata.createdAt))
        setHasUnsavedChanges(false)
      }
    } catch (err) {
      // No saved analysis is fine
    } finally {
      setIsLoading(false)
    }
  }, [gameLoopId])

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setError(null)
    setProgressMessages([])
    setReport(null)
    setHasUnsavedChanges(false)

    // Prepare input from current nodes/edges
    const mechanics = nodes
      .filter(n => n.type !== 'group')
      .map(n => ({
        id: n.id,
        name: (n.data as any)?.label || 'Unnamed',
        type: (n.data as any)?.nodeType || 'action',
        description: (n.data as any)?.description || '',
      }))

    const connections = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string | undefined,
    }))

    const loops = nodes
      .filter(n => n.type === 'group')
      .map(n => ({
        id: n.id,
        name: (n.data as any)?.label || 'Unnamed Loop',
        type: (n.data as any)?.timescale || 'custom',
        description: (n.data as any)?.description || '',
      }))

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/loop-creator/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanics,
          connections,
          loops,
          gameGenre: gameContext.gameGenre || 'indie',
          gamePlatform: gameContext.gamePlatform || 'pc',
          targetAudience: gameContext.targetAudience || 'core',
          gameDescription: gameContext.gameDescription || '',
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'report' && data.content) {
                setReport(data.content)
                setHasUnsavedChanges(true) // New report needs saving
              } else if (data.type === 'error') {
                setError(typeof data.content === 'string' ? data.content : 'Analysis error')
              } else {
                setProgressMessages(prev => [
                  ...prev,
                  {
                    type: data.type,
                    content:
                      typeof data.content === 'string'
                        ? data.content
                        : JSON.stringify(data.content),
                    timestamp: Date.now(),
                  },
                ])
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setIsAnalyzing(false)
      abortControllerRef.current = null
    }
  }, [nodes, edges, gameContext])

  const saveAnalysis = useCallback(async () => {
    if (!gameLoopId || !report) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setSavedAt(new Date(data.createdAt))
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [gameLoopId, report])

  const regenerateAnalysis = useCallback(async () => {
    if (gameLoopId) {
      // Delete existing first
      try {
        await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`, {
          method: 'DELETE',
        })
      } catch {
        // Ignore delete errors
      }
    }

    setSavedAt(null)
    await runAnalysis()
  }, [gameLoopId, runAnalysis])

  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsAnalyzing(false)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Market Analysis</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">AI-powered research on your game loop</p>
                {savedAt && !hasUnsavedChanges && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  >
                    <Check className="w-2.5 h-2.5 mr-1" />
                    Saved
                  </Badge>
                )}
                {hasUnsavedChanges && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    Unsaved
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && gameLoopId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-700 text-slate-400 hover:text-white"
                  onClick={regenerateAnalysis}
                  disabled={isAnalyzing}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`}
                  />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={saveAnalysis}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Loading Saved */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <span className="ml-2 text-slate-400">Loading saved analysis...</span>
              </div>
            )}

            {/* Start Analysis Section */}
            {!report && !isAnalyzing && !isLoading && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex p-4 rounded-full bg-indigo-500/10 border border-indigo-500/30">
                  <Search className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    {savedAt ? 'No Saved Analysis' : 'Ready to Analyze'}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Our AI will research market data, analyze competitors, and score your loop
                    against reference games like Vampire Survivors, Disco Elysium, and
                    Counter-Strike.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500">
                  <Badge variant="secondary" className="bg-slate-800/50">
                    {nodes.filter(n => n.type !== 'group').length} mechanics
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800/50">
                    {edges.length} connections
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800/50">
                    {gameContext.gameGenre || 'Unknown genre'}
                  </Badge>
                </div>
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={runAnalysis}
                  disabled={nodes.length === 0}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Start Analysis
                </Button>
                {nodes.length === 0 && (
                  <p className="text-xs text-amber-400">Add some nodes to your canvas first</p>
                )}
              </div>
            )}

            {/* Progress Section */}
            {isAnalyzing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    <span className="text-sm font-medium text-white">Analyzing market...</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelAnalysis}>
                    Cancel
                  </Button>
                </div>

                {progressMessages.length > 0 && (
                  <div className="space-y-1 p-3 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[200px] overflow-y-auto">
                    {progressMessages.slice(-10).map((msg, i) => (
                      <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-indigo-400 shrink-0">
                          {msg.type === 'tool_call' ? '🔧' : msg.type === 'tool_result' ? '✓' : '→'}
                        </span>
                        <span>{msg.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400">Analysis Error</h4>
                    <p className="text-xs text-red-300/80 mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={runAnalysis}
                >
                  Retry Analysis
                </Button>
              </div>
            )}

            {/* Report Results */}
            {report && !isLoading && (
              <div className="space-y-6">
                {/* Saved timestamp */}
                {savedAt && !hasUnsavedChanges && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Last saved: {savedAt.toLocaleString()}</span>
                  </div>
                )}

                {/* Overall Score */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                      Market Viability
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {report.overallScore}
                      <span className="text-lg text-slate-400">/100</span>
                    </div>
                  </div>
                  <div
                    className={`text-4xl ${
                      report.overallScore >= 70
                        ? 'text-emerald-400'
                        : report.overallScore >= 50
                          ? 'text-yellow-400'
                          : report.overallScore >= 30
                            ? 'text-orange-400'
                            : 'text-red-400'
                    }`}
                  >
                    {report.overallScore >= 70
                      ? '🟢'
                      : report.overallScore >= 50
                        ? '🟡'
                        : report.overallScore >= 30
                          ? '🟠'
                          : '🔴'}
                  </div>
                </div>

                {/* Reference Scores - Hidden from end users, internal scoring only */}
                {/* 
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">Disco Elysium</div>
                    <div className="text-xl font-bold text-purple-400">{report.referenceScores?.discoElysium || 0}</div>
                    <div className="text-[10px] text-slate-600">Narrative RPG</div>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">Vampire Survivors</div>
                    <div className="text-xl font-bold text-red-400">{report.referenceScores?.vampireSurvivors || 0}</div>
                    <div className="text-[10px] text-slate-600">Action Loop</div>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">Counter-Strike</div>
                    <div className="text-xl font-bold text-cyan-400">{report.referenceScores?.counterStrike || 0}</div>
                    <div className="text-[10px] text-slate-600">Competitive</div>
                  </div>
                </div>
                */}

                {/* Market Size */}
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Market Size</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">TAM</div>
                      <div className="text-lg font-bold text-white">{report.marketSize.tam}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Target Segment</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {report.marketSize.relevantSegment}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Growth</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {report.marketSize.growthRate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audience Fit */}
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">Audience Fit</h3>
                    </div>
                    <Badge
                      variant={report.audienceFit.fitScore >= 60 ? 'default' : 'secondary'}
                      className={
                        report.audienceFit.fitScore >= 60
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : ''
                      }
                    >
                      {report.audienceFit.fitScore}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    {report.audienceFit.targetDemographic}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-emerald-400 mb-2">Strengths</div>
                      <ul className="space-y-1">
                        {report.audienceFit.strengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs text-amber-400 mb-2">Concerns</div>
                      <ul className="space-y-1">
                        {report.audienceFit.concerns.slice(0, 3).map((c, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">!</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Competitors */}
                {report.competitors.length > 0 && (
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-orange-400" />
                      <h3 className="text-sm font-semibold text-white">
                        Competitors ({report.competitors.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {report.competitors.slice(0, 4).map((comp, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{comp.name}</div>
                            <div className="text-xs text-slate-500">{comp.genre}</div>
                          </div>
                          <Badge variant="secondary" className="bg-slate-700/50">
                            {comp.similarityScore}% similar
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities & Risks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-emerald-400">Opportunities</h3>
                    </div>
                    <ul className="space-y-2">
                      {report.opportunities.slice(0, 3).map((o, i) => (
                        <li key={i} className="text-xs text-slate-300">
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-semibold text-red-400">Risks</h3>
                    </div>
                    <ul className="space-y-2">
                      {report.risks.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-slate-300">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-indigo-400">Recommendations</h3>
                  </div>
                  <ol className="space-y-2">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
