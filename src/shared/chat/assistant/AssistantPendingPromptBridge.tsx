'use client'

import { useLayoutEffect, useRef } from 'react'
import { useThreadRuntime } from '@assistant-ui/react'
import type { AssistantPendingPrompt } from './use-assistant-pending-prompt'

interface AssistantPendingPromptBridgeProps {
  pendingPrompt: AssistantPendingPrompt | null | undefined
  onHandled?: (id: number) => void
}

/** Bible Regenerate: append user turn through assistant-ui runtime (same path as composer Send). */
export function AssistantPendingPromptBridge({
  pendingPrompt,
  onHandled,
}: AssistantPendingPromptBridgeProps): null {
  const thread = useThreadRuntime()
  const lastHandledId = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!pendingPrompt) return
    if (lastHandledId.current === pendingPrompt.id) return
    lastHandledId.current = pendingPrompt.id

    const running = thread.getState().isRunning
    if (running) {
      thread.cancelRun()
    }

    thread.append(pendingPrompt.text)
    onHandled?.(pendingPrompt.id)
  }, [pendingPrompt, thread, onHandled])

  return null
}
