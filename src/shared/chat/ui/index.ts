/**
 * Chat Components
 *
 * Reusable chat UI components for both storyteller and loop creator.
 */

export {
  AgentLog,
  AgentStatusIndicator,
  ActiveAgentsPanel,
  type AgentStatus,
  type AgentStatusInfo,
} from './AgentLog'

export { SectionProgress, type ProgressSection } from './SectionProgress'

export { CitationPreview, type Citation } from './CitationDisplay'

export { ChatInterface } from './ChatInterface'
export { ChatInput } from './ChatInput'
export { ModelSelector } from './ModelSelector'

// Re-export thinking messages configuration types and defaults
export {
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  type ThinkingMessagesConfig,
  type ThinkingMessageStep,
} from '../core/types'

export { QuickActions, SmartQuickActions, type QuickAction } from './QuickActions'

export { StreamingTerminal } from './StreamingTerminal'
export { StreamingSectionsInline } from './StreamingSectionsInline'
