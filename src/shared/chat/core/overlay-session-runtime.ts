import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import { ChatSessionStatus } from '@/shared/chat/core/constants/chat-session'

export function selectMountedSessions(
  sessions: readonly ChatSession[],
  focusedSessionId: string | null,
): ChatSession[] {
  return sessions.filter(
    session =>
      session.id === focusedSessionId || session.status === ChatSessionStatus.Streaming,
  )
}

/** Newest session only when nothing is focused. New Chat sets focus before the list refetch. */
export function selectFocusedSessionId(
  sessions: readonly ChatSession[],
  focusedSessionId: string | null,
): string | null {
  if (focusedSessionId) return focusedSessionId
  return sessions[0]?.id ?? null
}

export function prependCreatedChatSession(
  sessions: readonly ChatSession[] | undefined,
  created: ChatSession,
): ChatSession[] {
  const rows = sessions ?? []
  return [created, ...rows.filter(row => row.id !== created.id)]
}

/** Refresh / overlay open with an empty list cannot post until a thread exists. */
export function shouldCreateFocusedOverlaySession(input: {
  overlayOpen: boolean
  listReady: boolean
  sessionCount: number
  canCreate: boolean
}): boolean {
  return input.overlayOpen && input.listReady && input.sessionCount === 0 && input.canCreate
}

export function streamingSessionsWithoutRunId(
  sessions: readonly ChatSession[],
): ChatSession[] {
  return sessions.filter(
    session => session.status === ChatSessionStatus.Streaming && session.runId == null,
  )
}
