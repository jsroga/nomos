import { ChatSessionsApiSegment } from '@/shared/chat/core/constants/chat-session'

enum ChatSessionsQueryRoot {
  Root = 'chat-sessions',
}

export const chatSessionsKeys = {
  all: [ChatSessionsQueryRoot.Root] as const,
  list: (projectId: string) => [...chatSessionsKeys.all, projectId] as const,
  detail: (id: string) => [...chatSessionsKeys.all, id] as const,
  messages: (id: string) => [...chatSessionsKeys.all, id, ChatSessionsApiSegment.Messages] as const,
}
