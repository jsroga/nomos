import { useEffect, type MutableRefObject, type RefObject } from 'react'
import {
  ASSISTANT_TURN_SETTLE_MS,
  isAssistantTurnBusy,
  isAssistantTurnFailed,
  shouldEmitCompletedToolCalls,
} from './assistant-turn-phase'
import { ChatMessageRole } from '../core/utils/assistant-thread-ui'
import {
  extractCompletedAssistantToolCalls,
} from './extract-completed-assistant-tool-calls'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  deriveAssistantGenerationActivity,
  type AssistantGenerationActivity,
} from './derive-assistant-generation-activity'
import { AppModuleId } from '@/shared/data/constants/protocol'

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
    const failed = isAssistantTurnFailed(status, error)

    // Failed turns must settle even if status is still submitted/streaming.
    if (busy && !failed) {
      clearSettleTimer()
      wasBusy.current = true
      return
    }

    if (failed && busy) {
      wasBusy.current = true
    }

    if (!wasBusy.current) return
    if (settleTimer.current) return

    const errored = failed
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      const stillBusy =
        isAssistantTurnBusy(statusRef.current) &&
        !isAssistantTurnFailed(statusRef.current, errorRef.current)
      if (stillBusy) return
      wasBusy.current = false
      if (shouldEmitCompletedToolCalls(statusRef.current)) {
        emitFreshTools(messagesRef.current)
      }
      if (errored || isAssistantTurnFailed(statusRef.current, errorRef.current)) {
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
  error?: unknown,
  moduleKey?: string,
): void {
  if (!isAssistantTurnBusy(status) || isAssistantTurnFailed(status, error)) return
  const last = messages[messages.length - 1]
  const waitingOnAssistant = last == null || last.role !== ChatMessageRole.Assistant
  const derived = waitingOnAssistant
    ? null
    : deriveAssistantGenerationActivity(messages, resolvedAgentId, moduleKey)
  const waitingLabel =
    moduleKey === AppModuleId.LoopCreator
      ? AssistantGenerationLabel.LoopWaiting
      : AssistantGenerationLabel.WaitingFirstToken
  const activity: AssistantGenerationActivity = derived ?? {
    phase: AssistantGenerationPhase.Submitted,
    label: waitingLabel,
    agentId: resolvedAgentId,
  }
  const fingerprint = activityFingerprint(activity)
  if (fingerprint === lastActivityFingerprint.current) return
  lastActivityFingerprint.current = fingerprint
  onGenerationActivityRef.current?.(activity)
}
