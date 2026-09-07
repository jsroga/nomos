import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionCopy, ChatSessionStatus, ChatSessionWire } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  prependCreatedChatSession,
  selectFocusedSessionId,
  selectMountedSessions,
  shouldCreateFocusedOverlaySession,
  streamingSessionsWithoutRunId,
} from '@/shared/chat/core/overlay-session-runtime'

const FOCUSED = '11111111-1111-4111-8111-111111111111'
const STREAMING = '22222222-2222-4222-8222-222222222222'
const IDLE = '33333333-3333-4333-8333-333333333333'

function session(overrides: Partial<ChatSession>): ChatSession {
  return {
    id: IDLE,
    projectId: FOCUSED,
    userId: 'user-a',
    moduleId: AppModuleId.Storyteller,
    thread: `overlay:${overrides.id ?? IDLE}`,
    resource: 'user-a',
    title: ChatSessionCopy.PlaceholderTitle,
    titleLocked: false,
    status: ChatSessionStatus.Idle,
    runId: null,
    wire: ChatSessionWire.AiSdk,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('selectMountedSessions', () => {
  it('keeps the focused session and every streaming session when focus changes', () => {
    const rows = [
      session({ id: FOCUSED, status: ChatSessionStatus.Idle }),
      session({ id: STREAMING, status: ChatSessionStatus.Streaming }),
      session({ id: IDLE, status: ChatSessionStatus.Idle }),
    ]
    const first = selectMountedSessions(rows, FOCUSED).map(row => row.id)
    expect(first).toEqual([FOCUSED, STREAMING])
    const next = selectMountedSessions(rows, IDLE).map(row => row.id)
    expect(next).toEqual([STREAMING, IDLE])
    expect(next).toContain(STREAMING)
  })
})

describe('selectFocusedSessionId', () => {
  it('keeps the focused session when it is still in the list', () => {
    const rows = [session({ id: FOCUSED }), session({ id: IDLE })]
    expect(selectFocusedSessionId(rows, FOCUSED)).toBe(FOCUSED)
  })

  it('falls back to the newest listed session only when focus is missing', () => {
    const rows = [session({ id: FOCUSED }), session({ id: IDLE })]
    expect(selectFocusedSessionId(rows, null)).toBe(FOCUSED)
    expect(selectFocusedSessionId([], null)).toBeNull()
  })

  it('keeps a just-created id so New Chat does not snap back to the previous thread', () => {
    const rows = [session({ id: FOCUSED }), session({ id: IDLE })]
    expect(selectFocusedSessionId(rows, STREAMING)).toBe(STREAMING)
  })
})

describe('prependCreatedChatSession', () => {
  it('puts the new session first so it becomes the active thread', () => {
    const existing = session({ id: IDLE })
    const created = session({ id: FOCUSED })
    expect(prependCreatedChatSession([existing], created).map(row => row.id)).toEqual([FOCUSED, IDLE])
    expect(prependCreatedChatSession(undefined, created).map(row => row.id)).toEqual([FOCUSED])
    expect(prependCreatedChatSession([created, existing], created).map(row => row.id)).toEqual([
      FOCUSED,
      IDLE,
    ])
  })
})

describe('shouldCreateFocusedOverlaySession', () => {
  it('creates a thread only when the overlay is open and the list is empty', () => {
    expect(
      shouldCreateFocusedOverlaySession({
        overlayOpen: true,
        listReady: true,
        sessionCount: 0,
        canCreate: true,
      })
    ).toBe(true)
    expect(
      shouldCreateFocusedOverlaySession({
        overlayOpen: false,
        listReady: true,
        sessionCount: 0,
        canCreate: true,
      })
    ).toBe(false)
    expect(
      shouldCreateFocusedOverlaySession({
        overlayOpen: true,
        listReady: true,
        sessionCount: 1,
        canCreate: true,
      })
    ).toBe(false)
    expect(
      shouldCreateFocusedOverlaySession({
        overlayOpen: true,
        listReady: false,
        sessionCount: 0,
        canCreate: true,
      })
    ).toBe(false)
  })
})

describe('streamingSessionsWithoutRunId', () => {
  it('selects streaming rows with no durable runId', () => {
    const rows = [
      session({ id: STREAMING, status: ChatSessionStatus.Streaming, runId: null }),
      session({ id: FOCUSED, status: ChatSessionStatus.Streaming, runId: 'run-1' }),
      session({ id: IDLE, status: ChatSessionStatus.Idle, runId: null }),
    ]
    expect(streamingSessionsWithoutRunId(rows).map(row => row.id)).toEqual([STREAMING])
  })
})
