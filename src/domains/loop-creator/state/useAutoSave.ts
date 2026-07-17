import { useCallback, useEffect, useRef, useState } from 'react'
import { Node, Edge } from '@xyflow/react'
import { LoopAutoSaveMessage, LoopAutoSaveStatus } from '@/domains/loop-creator/constants/auto-save'
import { updateLoop } from '@/domains/loop-creator/core/io/loops.api'

interface UseAutoSaveOptions {
  loopId: string | null
  nodes: Node[]
  edges: Edge[]
  metadata?: unknown
  analysis?: unknown
  debounceMs?: number
  enabled?: boolean
}

interface SaveStatus {
  status: LoopAutoSaveStatus
  lastSaved: Date | null
  error: string | null
}

export function useAutoSave({
  loopId,
  nodes,
  edges,
  metadata,
  analysis,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: LoopAutoSaveStatus.Idle,
    lastSaved: null,
    error: null,
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<string>('')

  const save = useCallback(async () => {
    if (!loopId || !enabled) return

    try {
      setSaveStatus(prev => ({ ...prev, status: LoopAutoSaveStatus.Saving, error: null }))

      await updateLoop({
        id: loopId,
        nodes,
        edges,
        metadata,
        analysis,
      })

      setSaveStatus({
        status: LoopAutoSaveStatus.Saved,
        lastSaved: new Date(),
        error: null,
      })

      // Reset to idle after a brief period
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, status: LoopAutoSaveStatus.Idle }))
      }, 2000)
    } catch (error) {
      console.error(LoopAutoSaveMessage.AutoSaveFailedLog, error)
      setSaveStatus({
        status: LoopAutoSaveStatus.Error,
        lastSaved: null,
        error: error instanceof Error ? error.message : LoopAutoSaveMessage.SaveFailed,
      })
    }
  }, [loopId, nodes, edges, metadata, analysis, enabled])

  // Debounced auto-save when data changes
  useEffect(() => {
    if (!loopId || !enabled) return

    // Create a hash of the current data to detect changes
    const currentData = JSON.stringify({ nodes, edges, metadata, analysis })

    // Skip if data hasn't changed
    if (currentData === previousDataRef.current) return
    previousDataRef.current = currentData

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      save()
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loopId, nodes, edges, metadata, analysis, debounceMs, enabled, save])

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    save()
  }, [save])

  return {
    saveStatus,
    saveNow,
  }
}
