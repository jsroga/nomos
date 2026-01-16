/**
 * Generic Mention System Types
 * 
 * Extensible types for @ mention functionality across all chat implementations.
 * Supports three categories: Entities, Agents, and Sections.
 */

export type MentionCategory = 'entity' | 'agent' | 'section'

/**
 * A mentionable item that can be referenced in chat
 */
export interface MentionItem {
  /** Unique identifier */
  id: string
  /** Display name (what user sees and types) */
  name: string
  /** Category for grouping in popover */
  category: MentionCategory
  /** Specific type within category (e.g., 'character', 'writer', 'worldRules') */
  type: string
  /** Lucide icon name for visual display */
  icon?: string
  /** Short preview text shown in popover */
  preview?: string
  /** Full data to inject into message context */
  context?: unknown
}

/**
 * Provider interface for domain-specific mention sources
 */
export interface MentionProvider {
  /** Category this provider handles */
  category: MentionCategory
  /** Get items matching the filter string */
  getItems: (filter: string, projectContext: ProjectContext) => MentionItem[]
}

/**
 * Project context passed to providers for data access
 */
export interface ProjectContext {
  projectId: string
  // Storyteller-specific
  characters?: Array<{ id: string; name: string; role?: string; description?: string; [key: string]: unknown }>
  episodes?: Array<{ id: string; title?: string; number?: number; [key: string]: unknown }>
  beats?: Array<{ id: string; logline?: string; sequence?: number; [key: string]: unknown }>
  factions?: Array<{ id: string; name: string; ideology?: string; [key: string]: unknown }>
  seriesBible?: {
    worldRules?: Array<{ category: string; rule: string; consequence?: string; [key: string]: unknown }>
    inspirations?: { books?: Array<unknown>; movies?: Array<unknown>; games?: Array<unknown> }
    soundtracks?: Array<{ title: string; artist: string; youtubeUrl?: string; [key: string]: unknown }>
    plotTwists?: string[]
    [key: string]: unknown
  }
  // Loop Creator-specific
  mechanics?: Array<{ id: string; name: string; type?: string; description?: string; [key: string]: unknown }>
  loops?: Array<{ id: string; name: string; type?: string; description?: string; [key: string]: unknown }>
  connections?: Array<{ id: string; source: string; target: string; [key: string]: unknown }>
  balanceAnalysis?: unknown
  gameContext?: {
    genre?: string
    platform?: string
    targetAudience?: string
    [key: string]: unknown
  }
}

/**
 * Selected mention for tracking in input
 */
export interface SelectedMention {
  item: MentionItem
  /** Position in input where @ was typed */
  startIndex: number
  /** Position after the mention name */
  endIndex: number
}

/**
 * Category metadata for display
 */
export const CATEGORY_META: Record<MentionCategory, { label: string; icon: string }> = {
  entity: { label: 'ENTITIES', icon: 'Database' },
  agent: { label: 'AGENTS', icon: 'Bot' },
  section: { label: 'SECTIONS', icon: 'FileText' },
}

/**
 * Icon mapping for common mention types
 */
export const TYPE_ICONS: Record<string, string> = {
  // Entities
  character: 'User',
  episode: 'Tv',
  beat: 'Zap',
  faction: 'Users',
  mechanic: 'Cog',
  loop: 'RefreshCw',
  connection: 'GitBranch',
  // Agents
  writer: 'PenTool',
  premise_architect: 'Building2',
  plot_architect: 'Map',
  devils_advocate: 'AlertTriangle',
  episode_premise_architect: 'FileEdit',
  loop_planner: 'Layout',
  balance_analyst: 'Scale',
  market_analyst: 'TrendingUp',
  // Sections
  worldRules: 'Scroll',
  inspirations: 'Lightbulb',
  soundtracks: 'Music',
  plotTwists: 'Shuffle',
  balanceAnalysis: 'BarChart',
  gameContext: 'Gamepad2',
}
