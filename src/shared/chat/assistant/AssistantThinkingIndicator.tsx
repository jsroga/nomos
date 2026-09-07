'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useThread } from '@assistant-ui/react'
import { describeThinkingProgress } from '../core/thinking-progress'
import {
  createThreadIsRunningSelector,
  createThreadNeedsRunningPlaceholderSelector,
} from './assistant-thread-selectors'

const THINKING_TICK_MS = 1000

/**
 * Reasoning is not streamed, so a turn can sit with zero renderable frames for
 * a minute. Elapsed time is the only honest progress signal the client has.
 */
export function ThinkingIndicator() {
  const [startedAt] = useState(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), THINKING_TICK_MS)
    return () => clearInterval(timer)
  }, [startedAt])

  const progress = describeThinkingProgress(elapsedMs)

  return (
    <div className="aui-thinking" data-testid="assistant-running-status" aria-live="polite">
      <span className="aui-thinking-dots" aria-hidden>
        <span className="aui-thinking-dot" />
        <span className="aui-thinking-dot" />
        <span className="aui-thinking-dot" />
      </span>
      <span className="aui-thinking-label">
        {progress.label}
        {progress.showSeconds ? ` · ${progress.seconds}s` : ''}
      </span>
    </div>
  )
}

/** Dots while the user turn is last — assistant-ui has not mounted a running assistant row yet. */
export function ThreadRunningPlaceholder() {
  const isRunningSelector = useMemo(() => createThreadIsRunningSelector(), [])
  const needsPlaceholderSelector = useMemo(
    () => createThreadNeedsRunningPlaceholderSelector(),
    [],
  )
  const isRunning = useThread(isRunningSelector)
  const needsPlaceholder = useThread(needsPlaceholderSelector)
  if (!isRunning || !needsPlaceholder) return null

  return (
    <div className="aui-assistant-row aui-assistant-row--thinking">
      <span className="aui-avatar" aria-hidden>
        <Sparkles size={13} />
      </span>
      <div className="aui-assistant-body">
        <ThinkingIndicator />
      </div>
    </div>
  )
}
