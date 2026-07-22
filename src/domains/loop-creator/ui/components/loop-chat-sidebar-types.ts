import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'

export interface LoopChatSidebarProps {
  projectId: string
  mentionProviders: readonly MentionProvider[]
  projectContext: ProjectContext
  chatTourId: string
}
