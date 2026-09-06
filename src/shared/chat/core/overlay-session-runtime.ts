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

export function streamingSessionsWithoutRunId(
  sessions: readonly ChatSession[],
): ChatSession[] {
  return sessions.filter(
    session => session.status === ChatSessionStatus.Streaming && session.runId == null,
  )
}
