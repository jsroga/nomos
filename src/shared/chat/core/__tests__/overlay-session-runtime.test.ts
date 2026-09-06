import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionCopy, ChatSessionStatus, ChatSessionWire } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  selectMountedSessions,
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
