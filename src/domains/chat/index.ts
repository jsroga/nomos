/**
 * Chat public module API.
 */

export {
  AgentLog,
  AgentStatusIndicator,
  ActiveAgentsPanel,
  SectionProgress,
  CitationPreview,
  ChatInterface,
  ChatInput,
  ModelSelector,
  QuickActions,
  SmartQuickActions,
  StreamingTerminal,
  StreamingSectionsInline,
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
} from './ui'

export type {
  AgentStatus,
  AgentStatusInfo,
  ProgressSection,
  Citation,
  ThinkingMessagesConfig,
  ThinkingMessageStep,
  QuickAction,
} from './ui'

export { useChatStream } from './state/useChatStream'
export type { Message, ActionStatus, AgentAction, AgentConfigMap, AgentQuestion, ActionMessageLocation } from './core/types'
export { ApprovalActionStatus } from './core/types'
export { getGameEntityProvider } from './core/mentions/game-entity-provider'
export type { MentionProvider, MentionItem, ProjectContext } from './core/mentions/types'
