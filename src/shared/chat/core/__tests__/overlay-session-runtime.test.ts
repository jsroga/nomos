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
  overlayBridgePendingForSession,
  createDraftChatSession,
  isDraftChatSession,
  mergeSessionsWithDraft,
  shouldKeepFocusedSessionOnModuleChange,
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

  it('keeps the previous idle session mounted when focus moves to another thread', () => {
    const rows = [
      session({ id: FOCUSED, status: ChatSessionStatus.Idle }),
      session({ id: STREAMING, status: ChatSessionStatus.Streaming }),
      session({ id: IDLE, status: ChatSessionStatus.Idle }),
    ]
    expect(selectMountedSessions(rows, IDLE, FOCUSED).map(row => row.id)).toEqual([
      FOCUSED,
      STREAMING,
      IDLE,
    ])
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

  it('keeps a just-created id while the list is still empty', () => {
    expect(selectFocusedSessionId([], STREAMING)).toBe(STREAMING)
  })

  it('drops a focused id that is not in the loaded list', () => {
    const rows = [session({ id: FOCUSED }), session({ id: IDLE })]
    expect(selectFocusedSessionId(rows, STREAMING)).toBe(FOCUSED)
  })
})

describe('overlayBridgePendingForSession', () => {
  const PROMPT = { id: 7, text: 'Regenerate soundtracks' }

  it.each([
    {
      name: 'focused and ok',
      sessionId: FOCUSED,
      focusedSessionId: FOCUSED,
      sessionOk: true,
      pending: PROMPT,
      expected: PROMPT,
    },
    {
      name: 'other mounted session',
      sessionId: IDLE,
      focusedSessionId: FOCUSED,
      sessionOk: true,
      pending: PROMPT,
      expected: null,
    },
    {
      name: 'module mismatch',
      sessionId: FOCUSED,
      focusedSessionId: FOCUSED,
      sessionOk: false,
      pending: PROMPT,
      expected: null,
    },
    {
      name: 'no focus yet',
      sessionId: FOCUSED,
      focusedSessionId: null,
      sessionOk: true,
      pending: PROMPT,
      expected: null,
    },
    {
      name: 'empty pending',
      sessionId: FOCUSED,
      focusedSessionId: FOCUSED,
      sessionOk: true,
      pending: null,
      expected: null,
    },
  ])('$name', ({ sessionId, focusedSessionId, sessionOk, pending, expected }) => {
    expect(
      overlayBridgePendingForSession({
        sessionId,
        focusedSessionId,
        sessionOk,
        pending,
      }),
    ).toEqual(expected)
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
    expect(
      shouldCreateFocusedOverlaySession({
        overlayOpen: true,
        listReady: true,
        sessionCount: 0,
        canCreate: true,
        hasDraft: true,
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

describe('draft overlay sessions', () => {
  it('builds a local thread that is not persisted', () => {
    const draft = createDraftChatSession({
      id: FOCUSED,
      projectId: FOCUSED,
      moduleId: AppModuleId.Storyteller,
      now: '2026-01-01T00:00:00.000Z',
    })
    expect(isDraftChatSession(draft)).toBe(true)
    expect(isDraftChatSession(session({ id: IDLE }))).toBe(false)
    expect(mergeSessionsWithDraft([session({ id: IDLE })], draft).map(row => row.id)).toEqual([
      FOCUSED,
      IDLE,
    ])
  })

  it.each([
    { busy: true, keep: true },
    { busy: false, keep: false },
  ])('keep=$keep when busy=$busy', ({ busy, keep }) => {
    expect(shouldKeepFocusedSessionOnModuleChange(busy)).toBe(keep)
  })
})
