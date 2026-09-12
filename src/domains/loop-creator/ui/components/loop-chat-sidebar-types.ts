import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import type { LoopPendingAutoPrompt } from '@/domains/loop-creator/state/utils/start-loop-creator-generation-chat'

export interface LoopChatSidebarProps {
  projectId: string
  mentionProviders: readonly MentionProvider[]
  projectContext: ProjectContext
  chatTourId: string
  pendingAutoPrompt: LoopPendingAutoPrompt | null
  onPendingAutoPromptHandled: () => void
}
