/**
 * useMarketAnalysis Hook
 *
 * Manages market analysis state: loading saved, running new, saving results.
 */

import { useState, useCallback, useEffect } from 'react'
import { MarketAnalysisReport, LoopAnalysisInput } from '../agents/market-analyst/types'

interface MarketAnalysisState {
  report: MarketAnalysisReport | null
  isLoading: boolean
  isGenerating: boolean
  isSaving: boolean
  error: string | null
  progress: string[]
  savedAt: Date | null
}

interface UseMarketAnalysisReturn extends MarketAnalysisState {
  loadSaved: () => Promise<void>
  generate: (input: LoopAnalysisInput) => Promise<void>
  save: () => Promise<void>
  regenerate: (input: LoopAnalysisInput) => Promise<void>
  clearError: () => void
}

export function useMarketAnalysis(gameLoopId: string | null): UseMarketAnalysisReturn {
  const [state, setState] = useState<MarketAnalysisState>({
    report: null,
    isLoading: false,
    isGenerating: false,
    isSaving: false,
    error: null,
    progress: [],
    savedAt: null,
  })

  // Load saved analysis on mount
  const loadSaved = useCallback(async () => {
    if (!gameLoopId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load analysis')
      }

      if (data.exists && data.analysis) {
        setState(prev => ({
          ...prev,
          report: data.analysis,
          savedAt: new Date(data.metadata.createdAt),
          isLoading: false,
        }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load analysis',
      }))
    }
  }, [gameLoopId])

  // Generate new analysis
  const generate = useCallback(async (input: LoopAnalysisInput) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: ['Starting market analysis...'],
    }))

    try {
      const response = await fetch('/api/loop-creator/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'progress') {
                setState(prev => ({
                  ...prev,
                  progress: [...prev.progress, event.message],
                }))
              } else if (event.type === 'tool_call') {
                setState(prev => ({
                  ...prev,
                  progress: [...prev.progress, `Calling: ${event.tool}`],
                }))
              } else if (event.type === 'report') {
                setState(prev => ({
                  ...prev,
                  report: event.report,
                }))
              } else if (event.type === 'error') {
                throw new Error(event.message)
              } else if (event.type === 'done') {
                setState(prev => ({
                  ...prev,
                  isGenerating: false,
                  progress: [...prev.progress, 'Analysis complete!'],
                }))
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      }))
    }
  }, [])

  // Save current report to database
  const save = useCallback(async () => {
    if (!gameLoopId || !state.report) return

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const response = await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.report),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save analysis')
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        savedAt: new Date(data.createdAt),
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save analysis',
      }))
    }
  }, [gameLoopId, state.report])

  // Regenerate: delete saved and generate fresh
  const regenerate = useCallback(
    async (input: LoopAnalysisInput) => {
      if (!gameLoopId) {
        await generate(input)
        return
      }

      // Delete existing
      try {
        await fetch(`/api/loop-creator/market-analysis/${gameLoopId}`, {
          method: 'DELETE',
        })
      } catch (e) {
        // Ignore delete errors
      }

      // Clear state and regenerate
      setState(prev => ({
        ...prev,
        report: null,
        savedAt: null,
      }))

      await generate(input)
    },
    [gameLoopId, generate]
  )

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (gameLoopId) {
      loadSaved()
    }
  }, [gameLoopId, loadSaved])

  return {
    ...state,
    loadSaved,
    generate,
    save,
    regenerate,
    clearError,
  }
}
