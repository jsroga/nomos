import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionCopy, ChatSessionStatus, ChatSessionWire } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = '22222222-2222-4222-8222-222222222222'
const PROMPT = 'Design a core loop for a deckbuilder.'

vi.mock('@/shared/chat/core/io/chat-sessions.api', () => ({
  createChatSession: vi.fn(),
}))

import { createChatSession } from '@/shared/chat/core/io/chat-sessions.api'
import { queueNewWorkspaceChat } from '@/shared/chat/state/queue-new-workspace-chat'

function session(): ChatSession {
  return {
    id: SESSION_ID,
    projectId: PROJECT_ID,
    userId: 'user-a',
    moduleId: AppModuleId.LoopCreator,
    thread: `overlay:${SESSION_ID}`,
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

describe('queueNewWorkspaceChat', () => {
  beforeEach(() => {
    useWorkspaceChatUiStore.setState({
      overlayOpen: false,
      focusedSessionId: null,
      queuedSend: null,
      focusedSessionModuleId: null,
      mismatchDialog: null,
    })
    vi.mocked(createChatSession).mockReset()
    vi.mocked(createChatSession).mockResolvedValue(session())
  })

  it('creates a session, focuses it, queues the prompt, then opens the overlay', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const created = await queueNewWorkspaceChat({
      projectId: PROJECT_ID,
      moduleId: AppModuleId.LoopCreator,
      text: PROMPT,
      queryClient,
    })

    expect(created.id).toBe(SESSION_ID)
    expect(createChatSession).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      moduleId: AppModuleId.LoopCreator,
    })
    expect(queryClient.getQueryData(chatSessionsKeys.list(PROJECT_ID))).toEqual([session()])
    const ui = useWorkspaceChatUiStore.getState()
    expect(ui.focusedSessionId).toBe(SESSION_ID)
    expect(ui.focusedSessionModuleId).toBe(AppModuleId.LoopCreator)
    expect(ui.queuedSend).toMatchObject({ sessionId: SESSION_ID, text: PROMPT })
    expect(ui.overlayOpen).toBe(true)
  })
})
