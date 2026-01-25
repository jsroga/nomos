/**
 * Extended Thinking Utilities
 *
 * Utilities for handling extended thinking content:
 * - Separating <thinking> from <output> tags
 * - Filtering messages for display vs. activity log
 * - Progress indication during agent execution
 */

// ============================================
// TYPES
// ============================================

export interface ParsedThinkingContent {
  thinking: string | null
  output: string
  hasThinking: boolean
}

export interface AgentProgress {
  agent: string
  status: 'thinking' | 'analyzing' | 'writing' | 'critiquing' | 'refining' | 'complete'
  message: string
  timestamp: number
}

// ============================================
// THINKING CONTENT PARSING
// ============================================

/**
 * Parse content to separate <thinking> tags from <output> tags
 * Returns clean output for display, with thinking available for activity view
 */
export function parseThinkingContent(content: string): ParsedThinkingContent {
  // Match <thinking>...</thinking> blocks
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i)

  // Match <output>...</output> blocks
  const outputMatch = content.match(/<output>([\s\S]*?)<\/output>/i)

  if (thinkingMatch && outputMatch) {
    return {
      thinking: thinkingMatch[1].trim(),
      output: outputMatch[1].trim(),
      hasThinking: true,
    }
  }

  // If no output tags, remove thinking and return rest
  if (thinkingMatch) {
    const cleanContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
    return {
      thinking: thinkingMatch[1].trim(),
      output: cleanContent || content, // Fallback to original if nothing left
      hasThinking: true,
    }
  }

  // No thinking tags - return as-is
  return {
    thinking: null,
    output: content,
    hasThinking: false,
  }
}

/**
 * Extract only the user-facing output from agent response
 * Used for chat display when activity view is OFF
 */
export function extractDisplayContent(content: string): string {
  const parsed = parseThinkingContent(content)
  return parsed.output
}

/**
 * Check if content contains thinking tags
 */
export function hasThinkingContent(content: string): boolean {
  return /<thinking>/i.test(content)
}

/**
 * Get thinking content only (for activity view)
 */
export function extractThinkingContent(content: string): string | null {
  const parsed = parseThinkingContent(content)
  return parsed.thinking
}

// ============================================
// PROGRESS INDICATORS
// ============================================

const AGENT_PROGRESS_MESSAGES: Record<string, Record<AgentProgress['status'], string>> = {
  writer: {
    thinking: 'Analyzing scene requirements...',
    analyzing: 'Auditing character motivations...',
    writing: 'Crafting dialogue and action...',
    critiquing: 'Self-critiquing against GRRM standards...',
    refining: 'Refining prose quality...',
    complete: 'Scene complete',
  },
  plotArchitect: {
    thinking: 'Mapping story structure...',
    analyzing: 'Tracing consequences...',
    writing: 'Designing beat progression...',
    critiquing: 'Validating setup/payoff chains...',
    refining: 'Strengthening narrative causality...',
    complete: 'Beat structure complete',
  },
  characterPsychology: {
    thinking: 'Exploring character psychology...',
    analyzing: 'Mapping wants vs needs...',
    writing: 'Developing character insights...',
    critiquing: 'Checking for complexity...',
    refining: 'Deepening contradictions...',
    complete: 'Character analysis complete',
  },
  devilsAdvocate: {
    thinking: 'Identifying weaknesses...',
    analyzing: 'Stress-testing story logic...',
    writing: 'Formulating critique...',
    critiquing: 'Evaluating against prestige standards...',
    refining: 'Prioritizing critical issues...',
    complete: 'Critique complete',
  },
  default: {
    thinking: 'Thinking through approach...',
    analyzing: 'Analyzing requirements...',
    writing: 'Generating content...',
    critiquing: 'Reviewing quality...',
    refining: 'Refining output...',
    complete: 'Task complete',
  },
}

/**
 * Get a progress message for an agent's current status
 */
export function getProgressMessage(agent: string, status: AgentProgress['status']): string {
  const agentMessages = AGENT_PROGRESS_MESSAGES[agent] || AGENT_PROGRESS_MESSAGES.default
  return agentMessages[status]
}

/**
 * Create a progress update object
 */
export function createProgress(agent: string, status: AgentProgress['status']): AgentProgress {
  return {
    agent,
    status,
    message: getProgressMessage(agent, status),
    timestamp: Date.now(),
  }
}

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Format agent message for display
 * - Removes thinking tags
 * - Adds agent attribution
 * - Optionally includes progress indicator
 */
export function formatAgentMessage(
  content: string,
  agentName: string,
  options: {
    showThinking?: boolean
    includeProgress?: boolean
    currentStatus?: AgentProgress['status']
  } = {}
): {
  displayContent: string
  thinkingContent: string | null
  progressMessage: string | null
} {
  const parsed = parseThinkingContent(content)

  return {
    displayContent: parsed.output,
    thinkingContent: options.showThinking ? parsed.thinking : null,
    progressMessage: options.includeProgress && options.currentStatus
      ? getProgressMessage(agentName, options.currentStatus)
      : null,
  }
}

// ============================================
// ACTIVITY LOG HELPERS
// ============================================

export interface ActivityLogEntry {
  id: string
  timestamp: number
  agent: string
  type: 'thinking' | 'tool_call' | 'output' | 'progress'
  content: string
  metadata?: Record<string, unknown>
}

/**
 * Create an activity log entry for thinking content
 */
export function createThinkingLogEntry(
  agent: string,
  thinking: string
): ActivityLogEntry {
  return {
    id: `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    agent,
    type: 'thinking',
    content: thinking,
  }
}

/**
 * Create an activity log entry for progress updates
 */
export function createProgressLogEntry(progress: AgentProgress): ActivityLogEntry {
  return {
    id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: progress.timestamp,
    agent: progress.agent,
    type: 'progress',
    content: progress.message,
    metadata: { status: progress.status },
  }
}

/**
 * Filter activity log entries by type
 */
export function filterActivityLog(
  entries: ActivityLogEntry[],
  options: {
    showThinking?: boolean
    showProgress?: boolean
    showToolCalls?: boolean
  }
): ActivityLogEntry[] {
  return entries.filter(entry => {
    if (entry.type === 'thinking' && !options.showThinking) return false
    if (entry.type === 'progress' && !options.showProgress) return false
    if (entry.type === 'tool_call' && !options.showToolCalls) return false
    return true
  })
}
