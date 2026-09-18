import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import { AppModuleId } from '@/shared/data/constants/protocol'
import {
  ChatSessionCopy,
  ChatSessionDraftUser,
  ChatSessionStatus,
  ChatSessionThreadPrefix,
  ChatSessionWire,
} from '@/shared/chat/core/constants/chat-session'

export function selectMountedSessions(
  sessions: readonly ChatSession[],
  focusedSessionId: string | null,
  previousFocusedSessionId: string | null = null,
): ChatSession[] {
  return sessions.filter(
    session =>
      session.id === focusedSessionId ||
      session.id === previousFocusedSessionId ||
      session.status === ChatSessionStatus.Streaming,
  )
}

/** Keep focus when it is in the list, or while the list is still empty. */
export function selectFocusedSessionId(
  sessions: readonly ChatSession[],
  focusedSessionId: string | null,
): string | null {
  if (focusedSessionId && sessions.some(session => session.id === focusedSessionId)) {
    return focusedSessionId
  }
  if (focusedSessionId && sessions.length === 0) return focusedSessionId
  return sessions[0]?.id ?? null
}

export function overlayBridgePendingForSession(input: {
  sessionId: string
  focusedSessionId: string | null
  sessionOk: boolean
  pending: { id: number; text: string } | null
}): { id: number; text: string } | null {
  if (!input.sessionOk) return null
  if (input.sessionId !== input.focusedSessionId) return null
  return input.pending
}

export function prependCreatedChatSession(
  sessions: readonly ChatSession[] | undefined,
  created: ChatSession,
): ChatSession[] {
  const rows = sessions ?? []
  return [created, ...rows.filter(row => row.id !== created.id)]
}

export function mergeSessionsWithDraft(
  sessions: readonly ChatSession[],
  draft: ChatSession | null,
): ChatSession[] {
  if (!draft) return [...sessions]
  return prependCreatedChatSession(sessions, draft)
}

export function isDraftChatSession(session: ChatSession): boolean {
  return session.thread.startsWith(ChatSessionThreadPrefix.Draft)
}

export function createDraftChatSession(input: {
  id: string
  projectId: string
  moduleId: AppModuleId
  now?: string
}): ChatSession {
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id,
    projectId: input.projectId,
    userId: ChatSessionDraftUser.Id,
    moduleId: input.moduleId,
    thread: `${ChatSessionThreadPrefix.Draft}${input.id}`,
    resource: ChatSessionDraftUser.Id,
    title: ChatSessionCopy.PlaceholderTitle,
    titleLocked: false,
    status: ChatSessionStatus.Idle,
    runId: null,
    wire: ChatSessionWire.AiSdk,
    createdAt: now,
    updatedAt: now,
  }
}

/** Keep the live thread when generation is in flight; otherwise open an empty composer. */
export function shouldKeepFocusedSessionOnModuleChange(busy: boolean): boolean {
  return busy
}

/** Refresh / overlay open with an empty list cannot post until a thread exists. */
export function shouldCreateFocusedOverlaySession(input: {
  overlayOpen: boolean
  listReady: boolean
  sessionCount: number
  canCreate: boolean
  hasDraft?: boolean
}): boolean {
  return (
    input.overlayOpen &&
    input.listReady &&
    input.sessionCount === 0 &&
    !input.hasDraft &&
    input.canCreate
  )
}

export function streamingSessionsWithoutRunId(
  sessions: readonly ChatSession[],
): ChatSession[] {
  return sessions.filter(
    session => session.status === ChatSessionStatus.Streaming && session.runId == null,
  )
}
