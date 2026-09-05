'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { completeStorytellerScriptGhost } from '@/domains/storyteller/core/io/script-ghost.api'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import {
  ScriptGhostIdleMs,
  ScriptGhostKeyAction,
  scriptGhostKeyAction,
} from './script-ghost-keys'

export interface UseScriptGhostCompleteInput {
  enabled: boolean
  projectId: string
  episodeId: string
  mode: ManuscriptMode
  getPrefix: () => string
  onAccept: (ghost: string) => void
}

export function useScriptGhostComplete(input: UseScriptGhostCompleteInput): {
  ghost: string
  onKeyDown: (event: KeyboardEvent) => void
  rejectGhost: () => void
  schedule: () => void
} {
  const [ghost, setGhost] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ghostRef = useRef('')

  useEffect(() => {
    ghostRef.current = ghost
  }, [ghost])

  const rejectGhost = useCallback(() => {
    setGhost('')
  }, [])

  const schedule = useCallback(() => {
    if (!input.enabled || !input.projectId || !input.episodeId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const prefix = input.getPrefix()
      if (prefix.trim().length === 0) return
      void (async () => {
        try {
          const text = await completeStorytellerScriptGhost({
            projectId: input.projectId,
            episodeId: input.episodeId,
            prefix,
            mode: input.mode,
          })
          if (text) setGhost(text)
        } catch {
          setGhost('')
        }
      })()
    }, ScriptGhostIdleMs.Pause)
  }, [input])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = scriptGhostKeyAction(event.key, ghostRef.current.length > 0)
      if (action === ScriptGhostKeyAction.Accept) {
        event.preventDefault()
        const accepted = ghostRef.current
        setGhost('')
        if (accepted) input.onAccept(accepted)
        return
      }
      if (action === ScriptGhostKeyAction.Dismiss) {
        event.preventDefault()
        setGhost('')
        return
      }
      setGhost('')
      schedule()
    },
    [input, schedule]
  )

  return { ghost, onKeyDown, rejectGhost, schedule }
}
