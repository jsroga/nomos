import type {
  ActiveAgentsPanel,
  ChatInterface,
  SectionProgress,
} from '@/shared/chat'

export interface LoopChatSidebarProps {
  projectId: string
  currentLoopId: string | null
  userEmail: string | null
  isActivityPanelOpen: boolean
  onActivityToggle: () => void
  messages: Parameters<typeof ChatInterface>[0]['messages']
  onSendMessage: (message: string) => void
  isSending: boolean
  onStopStream: () => void
  thinkingAgent: string | null | undefined
  streamingTokens: string | null | undefined
  isTokenStreaming: boolean
  activeAgents: Parameters<typeof ActiveAgentsPanel>[0]['activeAgents']
  streamingSections: Parameters<typeof SectionProgress>[0]['sections']
  mentionProviders: Parameters<typeof ChatInterface>[0]['mentionProviders']
  projectContext: Parameters<typeof ChatInterface>[0]['projectContext']
  onCreateLoopFromEmptyState: () => void
  chatTourId: string
  quickActionsTourId: string
}
