'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { completeStorytellerScriptGhost } from '@/domains/storyteller/core/io/script-ghost.api'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { clipScriptGhostToFirstSentence } from '@/domains/storyteller/core/io/complete-script-ghost-pack'
import {
  scriptGhostContinuation,
  scriptGhostOverlapsManuscript,
  type ManuscriptCaretSlice,
} from './script-ghost-caret'
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
  getCaret: () => ManuscriptCaretSlice
  onAccept: (ghost: string) => void
}

export function useScriptGhostComplete(input: UseScriptGhostCompleteInput): {
  ghost: string
  ghostPrefix: string
  onKeyDown: (event: KeyboardEvent) => void
  rejectGhost: () => void
  schedule: () => void
} {
  const [ghost, setGhost] = useState('')
  const [ghostPrefix, setGhostPrefix] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ghostRef = useRef('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    ghostRef.current = ghost
  }, [ghost])

  const rejectGhost = useCallback(() => {
    requestIdRef.current += 1
    setGhost('')
    setGhostPrefix('')
  }, [])

  const schedule = useCallback(() => {
    if (!input.enabled || !input.projectId || !input.episodeId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const caret = input.getCaret()
      if (caret.prefix.trim().length === 0) return
      if (scriptGhostOverlapsManuscript(caret.suffix)) return
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      void (async () => {
        try {
          const text = await completeStorytellerScriptGhost({
            projectId: input.projectId,
            episodeId: input.episodeId,
            prefix: caret.prefix,
            mode: input.mode,
          })
          if (requestId !== requestIdRef.current) return
          const latest = input.getCaret()
          if (latest.prefix !== caret.prefix) return
          if (scriptGhostOverlapsManuscript(latest.suffix)) return
          const continuation = clipScriptGhostToFirstSentence(
            scriptGhostContinuation(caret.prefix, text),
          )
          if (continuation.length === 0) return
          setGhostPrefix(caret.prefix)
          setGhost(continuation)
        } catch {
          if (requestId !== requestIdRef.current) return
          setGhost('')
          setGhostPrefix('')
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
        rejectGhost()
        if (accepted) input.onAccept(accepted)
        return
      }
      if (action === ScriptGhostKeyAction.Dismiss) {
        event.preventDefault()
        rejectGhost()
        return
      }
      rejectGhost()
      schedule()
    },
    [input, rejectGhost, schedule]
  )

  return { ghost, ghostPrefix, onKeyDown, rejectGhost, schedule }
}
