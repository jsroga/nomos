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

export { 
  SectionProgress, 
  useSectionProgress,
  type ProgressSection,
} from './SectionProgress'

export { 
  CitationDisplay, 
  CitationMarker, 
  CitationPreview,
  parseInlineCitations,
  type Citation,
} from './CitationDisplay'

export { ChatInterface } from './ChatInterface'
export { ChatInput } from './ChatInput'

export { 
  QuickActions, 
  SmartQuickActions,
  createQuickActions,
  type QuickAction,
} from './QuickActions'

export { 
  HoverActions, 
  WithHoverActions,
} from './HoverActions'

export { 
  ContextChips, 
  ContextBar,
  extractContextFromMessage,
  type ContextItem,
} from './ContextChips'

export { 
  SuggestionCard,
  detectSuggestion,
  type Suggestion,
} from './SuggestionCard'

