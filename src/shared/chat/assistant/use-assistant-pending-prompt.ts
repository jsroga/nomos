'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  type AssistantGenerationActivity,
} from './derive-assistant-generation-activity'
import { isAssistantTurnBusy } from './assistant-turn-phase'

export interface AssistantPendingPrompt {
  id: number
  text: string
}

/** Clear stuck overlays if the stream dies without an idle transition (e.g. server restart). */
export const GENERATION_STUCK_TIMEOUT_MS = 180_000
/** Context assembly runs before the stream opens — show a slower hint after this. */
export const GENERATION_SLOW_HINT_MS = 12_000

enum AssistantClientLog {
  PendingSkipBusy = '[AssistantChat] pending prompt while busy — stopping prior turn',
  PendingSend = '[AssistantChat] sendMessage start id=',
  PendingSent = '[AssistantChat] sendMessage resolved id=',
  PendingError = '[AssistantChat] sendMessage error id=',
}

interface ExecutePendingChatPromptSendArgs {
  promptId: number
  promptText: string
  resolvedAgentId: string
  statusRef: MutableRefObject<string | undefined>
  sendMessage: (args: { text: string }) => Promise<unknown>
  stop: () => Promise<void> | void
  onPendingPromptHandled?: (id: number) => void
  onGenerationActivity?: (activity: AssistantGenerationActivity) => void
  clearStuckTimer: () => void
  finishGeneration: (opts?: { error?: string }) => void
  stuckTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>
  turnStartedAt: MutableRefObject<number | null>
  loggedFirstVisible: MutableRefObject<boolean>
}

/** Regenerate / bible refresh: put the user turn in chat first, then wire overlays. */
export async function executePendingChatPromptSend({
  promptId,
  promptText,
  resolvedAgentId,
  statusRef,
  sendMessage,
  stop,
  onPendingPromptHandled,
  onGenerationActivity,
  clearStuckTimer,
  finishGeneration,
  stuckTimer,
  turnStartedAt,
  loggedFirstVisible,
}: ExecutePendingChatPromptSendArgs): Promise<void> {
  if (isAssistantTurnBusy(statusRef.current)) {
    console.warn(AssistantClientLog.PendingSkipBusy)
    await stop()
  }

  console.log(`${AssistantClientLog.PendingSend}${promptId}`)
  const sendPromise = sendMessage({ text: promptText })
  onPendingPromptHandled?.(promptId)

  clearStuckTimer()
  turnStartedAt.current = Date.now()
  loggedFirstVisible.current = false

  const slowHintTimer = setTimeout(() => {
    onGenerationActivity?.({
      phase: AssistantGenerationPhase.Submitted,
      label: AssistantGenerationLabel.SubmittedSlow,
      agentId: resolvedAgentId,
    })
  }, GENERATION_SLOW_HINT_MS)
  stuckTimer.current = setTimeout(() => {
    clearTimeout(slowHintTimer)
    finishGeneration({ error: AssistantGenerationLabel.TimedOut })
  }, GENERATION_STUCK_TIMEOUT_MS)

  try {
    await sendPromise
    console.log(`${AssistantClientLog.PendingSent}${promptId}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AssistantGenerationLabel.Error
    console.error(`${AssistantClientLog.PendingError}${promptId}`, err)
    finishGeneration({ error: message })
  } finally {
    clearTimeout(slowHintTimer)
  }
}

interface UseAssistantPendingPromptArgs {
  pendingPrompt: AssistantPendingPrompt | null | undefined
  resolvedAgentId: string
  statusRef: MutableRefObject<string | undefined>
  sendMessageRef: MutableRefObject<(args: { text: string }) => Promise<unknown>>
  stopRef: MutableRefObject<() => Promise<void> | void>
  onPendingPromptHandledRef: MutableRefObject<((id: number) => void) | undefined>
  onGenerationActivityRef: MutableRefObject<
    ((activity: AssistantGenerationActivity) => void) | undefined
  >
  clearStuckTimer: () => void
  finishGeneration: (opts?: { error?: string }) => void
  stuckTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>
  turnStartedAt: MutableRefObject<number | null>
  loggedFirstVisible: MutableRefObject<boolean>
}

/** Sends an externally queued prompt once; stops a hung prior turn instead of swallowing. */
export function useAssistantPendingPrompt({
  pendingPrompt,
  resolvedAgentId,
  statusRef,
  sendMessageRef,
  stopRef,
  onPendingPromptHandledRef,
  onGenerationActivityRef,
  clearStuckTimer,
  finishGeneration,
  stuckTimer,
  turnStartedAt,
  loggedFirstVisible,
}: UseAssistantPendingPromptArgs): void {
  const lastHandledPromptId = useRef<number | null>(null)

  useEffect(() => {
    if (!pendingPrompt) return
    if (lastHandledPromptId.current === pendingPrompt.id) return
    lastHandledPromptId.current = pendingPrompt.id

    void executePendingChatPromptSend({
      promptId: pendingPrompt.id,
      promptText: pendingPrompt.text,
      resolvedAgentId,
      statusRef,
      sendMessage: args => sendMessageRef.current(args),
      stop: () => stopRef.current(),
      onPendingPromptHandled: id => onPendingPromptHandledRef.current?.(id),
      onGenerationActivity: activity => onGenerationActivityRef.current?.(activity),
      clearStuckTimer,
      finishGeneration,
      stuckTimer,
      turnStartedAt,
      loggedFirstVisible,
    })
  }, [
    pendingPrompt,
    resolvedAgentId,
    clearStuckTimer,
    finishGeneration,
    statusRef,
    sendMessageRef,
    stopRef,
    onPendingPromptHandledRef,
    onGenerationActivityRef,
    stuckTimer,
    turnStartedAt,
    loggedFirstVisible,
  ])
}
