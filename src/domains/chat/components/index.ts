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

export {
  CitationDisplay,
  CitationMarker,
  CitationPreview,
  parseInlineCitations,
  type Citation,
} from './CitationDisplay'

export { ChatInterface } from './ChatInterface'
export { ChatInput } from './ChatInput'

// Re-export thinking messages configuration types and defaults
export {
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  type ThinkingMessagesConfig,
  type ThinkingMessageStep,
} from '../types'

export {
  QuickActions,
  SmartQuickActions,
  createQuickActions,
  type QuickAction,
} from './QuickActions'

export { HoverActions, WithHoverActions } from './HoverActions'

export {
  ContextChips,
  ContextBar,
  extractContextFromMessage,
  type ContextItem,
} from './ContextChips'

export { SuggestionCard, detectSuggestion, type Suggestion } from './SuggestionCard'
