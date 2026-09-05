/**
 * Turn-state predicates shared by the chat host. Kept pure so the rule "no
 * approval overlay while the answer is still streaming" is covered by a test
 * rather than by reading an effect body.
 */

export enum AssistantChatStreamStatus {
  Submitted = 'submitted',
  Streaming = 'streaming',
  Ready = 'ready',
  Error = 'error',
}

/**
 * Multi-step agent turns can flip to `ready` between tool rounds before the
 * next submit. Wait this long after leaving busy before treating the turn as
 * settled (emit tools / clear overlays).
 */
export const ASSISTANT_TURN_SETTLE_MS = 450

/** True while the assistant still owes us output for this turn. */
export function isAssistantTurnBusy(status: string | undefined): boolean {
  return (
    status === AssistantChatStreamStatus.Submitted ||
    status === AssistantChatStreamStatus.Streaming
  )
}

/**
 * Stream SDKs can leave status as `streaming`/`submitted` after `error` is set.
 * Treat that as terminal so overlays and section loading unlock.
 */
export function isAssistantTurnFailed(
  status: string | undefined,
  error: unknown,
): boolean {
  return status === AssistantChatStreamStatus.Error || Boolean(error)
}

/**
 * Completed tool calls become pending bible approvals. A tool settles mid-stream,
 * so emitting while busy puts an Accept/Reject overlay on screen before the
 * answer is finished — hold them until the turn ends.
 *
 * Callers must debounce with {@link ASSISTANT_TURN_SETTLE_MS}: a transient
 * `ready` between tool steps is not turn end.
 */
export function shouldEmitCompletedToolCalls(status: string | undefined): boolean {
  return !isAssistantTurnBusy(status)
}
