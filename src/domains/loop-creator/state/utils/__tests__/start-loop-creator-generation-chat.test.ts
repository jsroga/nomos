import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionCopy, ChatSessionStatus, ChatSessionWire } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  LOOP_CREATOR_AUTO_START_PROMPT_PREFIX,
  LOOP_CREATOR_CHAT_START_FAILED,
} from '@/domains/loop-creator/constants/loop-creator-auto-start'
import { buildLoopCreatorAutoStartPrompt } from '@/domains/loop-creator/utils/loop-creator-auto-start'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const CONCEPT = 'A narrative RPG like Disco Elysium'

vi.mock('@/shared/chat/state/queue-new-workspace-chat', () => ({
  queueNewWorkspaceChat: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

import { queueNewWorkspaceChat } from '@/shared/chat/state/queue-new-workspace-chat'
import { toast } from 'sonner'
import { startLoopCreatorGenerationChat } from '@/domains/loop-creator/state/utils/start-loop-creator-generation-chat'

function createdSession(): ChatSession {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    projectId: PROJECT_ID,
    userId: 'user-a',
    moduleId: AppModuleId.LoopCreator,
    thread: 'overlay:22222222-2222-4222-8222-222222222222',
    resource: 'user-a',
    title: ChatSessionCopy.PlaceholderTitle,
    titleLocked: false,
    status: ChatSessionStatus.Idle,
    runId: null,
    wire: ChatSessionWire.AiSdk,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildLoopCreatorAutoStartPrompt', () => {
  it('embeds the game concept in the first chat turn', () => {
    const prompt = buildLoopCreatorAutoStartPrompt(CONCEPT)
    expect(prompt.startsWith(LOOP_CREATOR_AUTO_START_PROMPT_PREFIX)).toBe(true)
    expect(prompt).toContain(CONCEPT)
  })
})

describe('startLoopCreatorGenerationChat', () => {
  it('queues a new overlay chat when the workspace overlay is on', async () => {
    vi.mocked(queueNewWorkspaceChat).mockResolvedValueOnce(createdSession())
    const setPendingAutoPrompt = vi.fn()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await startLoopCreatorGenerationChat({
      projectId: PROJECT_ID,
      gameConcept: CONCEPT,
      queryClient,
      overlayEnabled: true,
      setPendingAutoPrompt,
    })

    expect(setPendingAutoPrompt).not.toHaveBeenCalled()
    expect(queueNewWorkspaceChat).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      moduleId: AppModuleId.LoopCreator,
      text: buildLoopCreatorAutoStartPrompt(CONCEPT),
      queryClient,
    })
  })

  it('stores a pending prompt when the overlay is off', async () => {
    const setPendingAutoPrompt = vi.fn()
    vi.mocked(queueNewWorkspaceChat).mockClear()

    await startLoopCreatorGenerationChat({
      projectId: PROJECT_ID,
      gameConcept: CONCEPT,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      overlayEnabled: false,
      setPendingAutoPrompt,
    })

    expect(queueNewWorkspaceChat).not.toHaveBeenCalled()
    expect(setPendingAutoPrompt).toHaveBeenCalledWith({
      id: expect.any(Number),
      text: buildLoopCreatorAutoStartPrompt(CONCEPT),
    })
  })

  it('toasts when overlay chat cannot be created', async () => {
    vi.mocked(queueNewWorkspaceChat).mockRejectedValueOnce(new Error('offline'))
    const setPendingAutoPrompt = vi.fn()

    await startLoopCreatorGenerationChat({
      projectId: PROJECT_ID,
      gameConcept: CONCEPT,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      overlayEnabled: true,
      setPendingAutoPrompt,
    })

    expect(toast.error).toHaveBeenCalledWith(LOOP_CREATOR_CHAT_START_FAILED)
    expect(setPendingAutoPrompt).not.toHaveBeenCalled()
  })
})

describe('useLoopPersistence auto-start wiring', () => {
  it('starts generation chat after a loop is created with a concept', () => {
    const src = readFileSync('src/domains/loop-creator/state/hooks/useLoopPersistence.ts', 'utf8')
    expect(src).toContain('startLoopCreatorGenerationChat')
    expect(src).toContain('isWorkspaceChatOverlayEnabled()')
    expect(src).not.toContain('setPendingAutoMessage')
  })
})
