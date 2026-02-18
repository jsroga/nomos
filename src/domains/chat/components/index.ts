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

export { SectionProgress, useSectionProgress, type ProgressSection } from './SectionProgress'

export { CitationMarker, CitationPreview, type Citation } from './CitationDisplay'

export { ChatInterface } from './ChatInterface'
export { ChatInput } from './ChatInput'

// Re-export thinking messages configuration types and defaults
export {
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  type ThinkingMessagesConfig,
  type ThinkingMessageStep,
} from '../types'

export { QuickActions, SmartQuickActions, type QuickAction } from './QuickActions'

export { HoverActions } from './HoverActions'

export { ContextChips, type ContextItem } from './ContextChips'

export { type Suggestion } from './SuggestionCard'
