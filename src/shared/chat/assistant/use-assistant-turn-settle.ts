import { useEffect, type MutableRefObject, type RefObject } from 'react'
import {
  AssistantChatStreamStatus,
  ASSISTANT_TURN_SETTLE_MS,
  isAssistantTurnBusy,
  shouldEmitCompletedToolCalls,
} from './assistant-turn-phase'
import {
  extractCompletedAssistantToolCalls,
} from './extract-completed-assistant-tool-calls'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  deriveAssistantGenerationActivity,
  type AssistantGenerationActivity,
} from './derive-assistant-generation-activity'

type AssistantThreadMessages = Parameters<typeof extractCompletedAssistantToolCalls>[0]

/** Phase/tool identity only — preview deltas during input-streaming must not re-emit. */
function activityFingerprint(activity: AssistantGenerationActivity | null): string {
  if (!activity) return ''
  return [
    activity.phase,
    activity.label,
    activity.toolName ?? '',
    activity.toolComplete === true ? '1' : '0',
    activity.error ?? '',
    activity.agentId ?? '',
  ].join('|')
}

export interface UseAssistantTurnSettleArgs {
  status: string | undefined
  error: unknown
  resolvedAgentId: string
  wasBusy: MutableRefObject<boolean>
  settleTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>
  lastActivityFingerprint: MutableRefObject<string>
  statusRef: MutableRefObject<string | undefined>
  messagesRef: MutableRefObject<AssistantThreadMessages>
  errorRef: MutableRefObject<unknown>
  onGenerationActivityRef: RefObject<((activity: AssistantGenerationActivity) => void) | undefined>
  finishGeneration: (opts?: { error?: string }) => void
  clearSettleTimer: () => void
  emitFreshTools: (messages: AssistantThreadMessages) => void
}

/** Busy activity updates + debounced turn-settle (tool emit / finish). */
export function useAssistantTurnSettle({
  status,
  error,
  resolvedAgentId,
  wasBusy,
  settleTimer,
  lastActivityFingerprint,
  statusRef,
  messagesRef,
  errorRef,
  onGenerationActivityRef,
  finishGeneration,
  clearSettleTimer,
  emitFreshTools,
}: UseAssistantTurnSettleArgs): void {
  useEffect(() => {
    const busy = isAssistantTurnBusy(status)

    if (busy) {
      clearSettleTimer()
      wasBusy.current = true
      return
    }

    if (!wasBusy.current) return
    if (settleTimer.current) return

    const errored = status === AssistantChatStreamStatus.Error || Boolean(error)
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      if (isAssistantTurnBusy(statusRef.current)) return
      wasBusy.current = false
      if (shouldEmitCompletedToolCalls(statusRef.current)) {
        emitFreshTools(messagesRef.current)
      }
      if (errored || statusRef.current === AssistantChatStreamStatus.Error || errorRef.current) {
        finishGeneration({
          error:
            errorRef.current instanceof Error
              ? errorRef.current.message
              : AssistantGenerationLabel.Error,
        })
      } else {
        finishGeneration()
      }
    }, ASSISTANT_TURN_SETTLE_MS)
  }, [
    status,
    error,
    resolvedAgentId,
    finishGeneration,
    clearSettleTimer,
    emitFreshTools,
    wasBusy,
    settleTimer,
    lastActivityFingerprint,
    statusRef,
    messagesRef,
    errorRef,
    onGenerationActivityRef,
  ])
}

/**
 * Re-derive generation activity when messages change during a busy turn without
 * listing messages in the settle effect deps (avoids per-delta effect runs).
 */
export function syncBusyTurnActivityFromMessages(
  status: string | undefined,
  messages: AssistantThreadMessages,
  resolvedAgentId: string,
  lastActivityFingerprint: MutableRefObject<string>,
  onGenerationActivityRef: RefObject<((activity: AssistantGenerationActivity) => void) | undefined>,
): void {
  if (!isAssistantTurnBusy(status)) return
  const derived = deriveAssistantGenerationActivity(messages, resolvedAgentId)
  const activity: AssistantGenerationActivity = derived ?? {
    phase: AssistantGenerationPhase.Submitted,
    label: AssistantGenerationLabel.Submitted,
    agentId: resolvedAgentId,
  }
  const fingerprint = activityFingerprint(activity)
  if (fingerprint === lastActivityFingerprint.current) return
  lastActivityFingerprint.current = fingerprint
  onGenerationActivityRef.current?.(activity)
}
