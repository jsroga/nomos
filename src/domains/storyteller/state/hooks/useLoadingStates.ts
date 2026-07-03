/**
 * useLoadingStates Hook
 *
 * Smart multi-section loading state management for UI responsiveness.
 * Tracks multiple concurrent loading operations with exact placement and progress.
 *
 * Features:
 * - Multiple concurrent loading states
 * - Per-section shimmer control
 * - Progress tracking per operation
 * - Human-friendly status messages
 * - Auto-cleanup on completion
 */

import { useState, useCallback, useMemo } from 'react'

export interface LoadingOperation {
  id: string
  section: string
  label: string
  startTime: number
  progress?: number // 0-100
  status: 'pending' | 'loading' | 'completing' | 'done' | 'error'
  details?: string
}

interface UseLoadingStatesReturn {
  // State
  operations: LoadingOperation[]
  isAnyLoading: boolean

  // Section checks
  isSectionLoading: (section: string) => boolean
  getSectionProgress: (section: string) => number | null
  getSectionLabel: (section: string) => string | null

  // Actions
  startLoading: (id: string, section: string, label: string) => void
  updateProgress: (id: string, progress: number, details?: string) => void
  finishLoading: (id: string) => void
  errorLoading: (id: string, error: string) => void
  clearAll: () => void

  // Computed
  activeCount: number
  loadingSections: string[]
}

export function useLoadingStates(): UseLoadingStatesReturn {
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map())

  const startLoading = useCallback((id: string, section: string, label: string) => {
    setOperations(prev => {
      const next = new Map(prev)
      next.set(id, {
        id,
        section,
        label,
        startTime: Date.now(),
        progress: 0,
        status: 'loading',
      })
      return next
    })
  }, [])

  const updateProgress = useCallback((id: string, progress: number, details?: string) => {
    setOperations(prev => {
      const op = prev.get(id)
      if (!op) return prev

      const next = new Map(prev)
      next.set(id, {
        ...op,
        progress: Math.min(100, Math.max(0, progress)),
        details,
        status: progress >= 100 ? 'completing' : 'loading',
      })
      return next
    })
  }, [])

  const finishLoading = useCallback((id: string) => {
    setOperations(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const errorLoading = useCallback((id: string, error: string) => {
    setOperations(prev => {
      const op = prev.get(id)
      if (!op) return prev

      const next = new Map(prev)
      next.set(id, {
        ...op,
        status: 'error',
        details: error,
      })
      // Auto-remove errors after 3 seconds
      setTimeout(() => {
        setOperations(p => {
          const n = new Map(p)
          n.delete(id)
          return n
        })
      }, 3000)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setOperations(new Map())
  }, [])

  // Computed values
  const operationsList = useMemo(() => Array.from(operations.values()), [operations])

  const isAnyLoading = useMemo(
    () => operationsList.some(op => op.status === 'loading' || op.status === 'completing'),
    [operationsList]
  )

  const loadingSections = useMemo(
    () => [
      ...new Set(
        operationsList
          .filter(op => op.status === 'loading' || op.status === 'completing')
          .map(op => op.section)
      ),
    ],
    [operationsList]
  )

  const isSectionLoading = useCallback(
    (section: string) => {
      return operationsList.some(
        op => op.section === section && (op.status === 'loading' || op.status === 'completing')
      )
    },
    [operationsList]
  )

  const getSectionProgress = useCallback(
    (section: string) => {
      const sectionOps = operationsList.filter(op => op.section === section)
      if (sectionOps.length === 0) return null

      const totalProgress = sectionOps.reduce((sum, op) => sum + (op.progress || 0), 0)
      return Math.round(totalProgress / sectionOps.length)
    },
    [operationsList]
  )

  const getSectionLabel = useCallback(
    (section: string) => {
      const op = operationsList.find(op => op.section === section && op.status === 'loading')
      return op?.label || null
    },
    [operationsList]
  )

  return {
    operations: operationsList,
    isAnyLoading,
    isSectionLoading,
    getSectionProgress,
    getSectionLabel,
    startLoading,
    updateProgress,
    finishLoading,
    errorLoading,
    clearAll,
    activeCount: operationsList.filter(op => op.status === 'loading').length,
    loadingSections,
  }
}
