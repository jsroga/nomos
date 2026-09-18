import type { QueryClient } from '@tanstack/react-query'
import type { AppModuleId } from '@/shared/data/constants/protocol'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import { createChatSession } from '@/shared/chat/core/io/chat-sessions.api'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import { prependCreatedChatSession } from '@/shared/chat/core/overlay-session-runtime'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export async function queueNewWorkspaceChat(input: {
  projectId: string
  moduleId: AppModuleId
  text: string
  queryClient: QueryClient
}): Promise<ChatSession> {
  const created = await createChatSession({
    projectId: input.projectId,
    moduleId: input.moduleId,
  })
  input.queryClient.setQueryData(
    chatSessionsKeys.list(input.projectId),
    (current: ChatSession[] | undefined) => prependCreatedChatSession(current, created),
  )
  const store = useWorkspaceChatUiStore.getState()
  store.setDraftSession(null)
  store.setFocusedSessionId(created.id, created.moduleId)
  store.setQueuedSend({ sessionId: created.id, text: input.text, id: Date.now() })
  store.setOverlayOpen(true)
  await input.queryClient.invalidateQueries({ queryKey: chatSessionsKeys.list(input.projectId) })
  return created
}

export async function persistDraftWorkspaceChat(input: {
  draft: ChatSession
  text: string
  queryClient: QueryClient
}): Promise<ChatSession> {
  return queueNewWorkspaceChat({
    projectId: input.draft.projectId,
    moduleId: input.draft.moduleId,
    text: input.text,
    queryClient: input.queryClient,
  })
}
