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

/** True while the assistant still owes us output for this turn. */
export function isAssistantTurnBusy(status: string | undefined): boolean {
  return (
    status === AssistantChatStreamStatus.Submitted ||
    status === AssistantChatStreamStatus.Streaming
  )
}

/**
 * Completed tool calls become pending bible approvals. A tool settles mid-stream,
 * so emitting while busy puts an Accept/Reject overlay on screen before the
 * answer is finished — hold them until the turn ends.
 */
export function shouldEmitCompletedToolCalls(status: string | undefined): boolean {
  return !isAssistantTurnBusy(status)
}
