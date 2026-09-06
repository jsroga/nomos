import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/constants/assistant-thread-ui'
import { ChatSessionCopy, ChatSessionStatus, ChatSessionWire } from '@/shared/chat/core/constants/chat-session'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { tryProjectScope, type ProjectScope } from '@/shared/auth/project-scope'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = 'user-a'
const PROJECT_ID = '22222222-2222-4222-8222-222222222222'
const ASSISTANT_ROUTE = 'src/app/api/assistant/[agentId]/route.ts'

const completeMock = vi.fn()
const findOwnedChatSession = vi.fn()
const applyGeneratedChatSessionTitle = vi.fn()

vi.mock('@/shared/auth/project-access', () => ({
  verifyProjectAccess: async () => true,
}))

vi.mock('@/shared/ai/gateway', () => ({
  complete: (...args: unknown[]) => completeMock(...args),
}))

vi.mock('@/shared/chat/core/io/chat-session-store', () => ({
  findOwnedChatSession: (...args: unknown[]) => findOwnedChatSession(...args),
  applyGeneratedChatSessionTitle: (...args: unknown[]) => applyGeneratedChatSessionTitle(...args),
}))

import {
  firstUserTextFromUiMessages,
  sanitizeGeneratedChatTitle,
  scheduleChatSessionTitle,
  titleChatSession,
} from '../title-chat-session'

function sessionRow(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: SESSION_ID,
    projectId: PROJECT_ID,
    userId: USER_ID,
    moduleId: AppModuleId.Storyteller,
    thread: `overlay:${SESSION_ID}`,
    resource: USER_ID,
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

const userTurn = [
  {
    role: ChatMessageRole.User,
    parts: [{ type: ChatPartType.Text, text: 'Draft the siege of Winterfell' }],
  },
]

describe('titleChatSession', () => {
  beforeEach(() => {
    completeMock.mockReset()
    findOwnedChatSession.mockReset()
    applyGeneratedChatSessionTitle.mockReset()
  })

  async function withScope(run: (scope: ProjectScope) => Promise<void> | void) {
    const minted = await tryProjectScope(PROJECT_ID, USER_ID)
    expect(minted).not.toBeNull()
    if (minted === null) return
    await run(minted)
  }

  it('leaves the placeholder when complete fails', async () => {
    findOwnedChatSession.mockResolvedValue(sessionRow())
    completeMock.mockRejectedValue(new Error('gateway down'))
    await withScope(scope =>
      titleChatSession({
        sessionId: SESSION_ID,
        userId: USER_ID,
        scope,
        messages: userTurn,
      }),
    )
    expect(applyGeneratedChatSessionTitle).not.toHaveBeenCalled()
  })

  it('does not overwrite a locked title', async () => {
    findOwnedChatSession.mockResolvedValue(sessionRow({ title: 'Keep me', titleLocked: true }))
    await withScope(scope =>
      titleChatSession({
        sessionId: SESSION_ID,
        userId: USER_ID,
        scope,
        messages: userTurn,
      }),
    )
    expect(completeMock).not.toHaveBeenCalled()
    expect(applyGeneratedChatSessionTitle).not.toHaveBeenCalled()
  })

  it('does not overwrite a non-placeholder title', async () => {
    findOwnedChatSession.mockResolvedValue(
      sessionRow({ title: 'Already named', titleLocked: false }),
    )
    await withScope(scope =>
      titleChatSession({
        sessionId: SESSION_ID,
        userId: USER_ID,
        scope,
        messages: userTurn,
      }),
    )
    expect(completeMock).not.toHaveBeenCalled()
    expect(applyGeneratedChatSessionTitle).not.toHaveBeenCalled()
  })

  it('writes a sanitized title through complete and ChatSessionTitle', async () => {
    findOwnedChatSession.mockResolvedValue(sessionRow())
    completeMock.mockResolvedValue({ text: '"Siege of Winterfell extra words here"' })
    applyGeneratedChatSessionTitle.mockResolvedValue(sessionRow({ title: 'Siege of Winterfell extra words here' }))
    await withScope(scope =>
      titleChatSession({
        sessionId: SESSION_ID,
        userId: USER_ID,
        scope,
        messages: userTurn,
      }),
    )
    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: LlmFeature.ChatSessionTitle,
        model: TEXT_GEN_FAST_MODEL,
      }),
    )
    expect(applyGeneratedChatSessionTitle).toHaveBeenCalledWith({
      id: SESSION_ID,
      userId: USER_ID,
      title: 'Siege of Winterfell extra words here',
    })
  })

  it('schedules title without awaiting handleChatStream', () => {
    const src = readFileSync(ASSISTANT_ROUTE, 'utf8')
    expect(src).toContain('scheduleChatSessionTitle(')
    expect(src).not.toContain('await scheduleChatSessionTitle')
    expect(src).not.toContain('await titleChatSession')
    expect(src.indexOf('scheduleChatSessionTitle(')).toBeLessThan(src.indexOf('await handleChatStream('))
  })

  it('extracts the latest user text and strips quotes', () => {
    expect(firstUserTextFromUiMessages(userTurn)).toBe('Draft the siege of Winterfell')
    expect(sanitizeGeneratedChatTitle('"One two three four five six seven"')).toBe(
      'One two three four five six',
    )
  })

  it('scheduleChatSessionTitle does not return a thenable', async () => {
    findOwnedChatSession.mockResolvedValue(sessionRow({ titleLocked: true }))
    await withScope(scope => {
      const result = scheduleChatSessionTitle({
        sessionId: SESSION_ID,
        userId: USER_ID,
        scope,
        messages: userTurn,
      })
      expect(result).toBeUndefined()
    })
  })
})
