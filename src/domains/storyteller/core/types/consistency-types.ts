/**
 * Story Consistency System Types
 *
 * Defines types for consistency checking, conflict detection, and auto-fixing.
 */

export type ConsistencyType = 'character' | 'timeline' | 'world_rule' | 'plot_logic' | 'tone'
export type SeverityLevel = 'minor' | 'major' | 'critical'

/**
 * Detected inconsistency in the story
 */
export interface Inconsistency {
  id: string
  type: ConsistencyType
  severity: SeverityLevel
  description: string
  affectedElements: AffectedElement[]
}

/**
 * Element affected by an inconsistency
 */
export interface AffectedElement {
  type: string // 'character', 'beat', 'episode', 'world_rule', etc.
  id: string
  name?: string
  fieldPath: string // JSON path like "psychology.traits.brave"
}

/**
 * A specific change to fix an inconsistency
 */
export interface ConsistencyChange {
  path: string // JSON path to the field
  before: unknown
  after: unknown
  reason: string
}

/**
 * A fix targeting a specific story element
 */
export interface ConsistencyFix {
  id: string
  inconsistencyId: string
  targetElement: {
    type: string
    id: string
    name?: string
  }
  changes: ConsistencyChange[]
}

/**
 * Result of a consistency check
 */
export interface ConsistencyCheckResult {
  id: string
  timestamp: number
  inconsistencies: Inconsistency[]
  fixes: ConsistencyFix[]
  summary: string
  totalAffected: number
}

/**
 * Result of applying fixes
 */
export interface CascadeResult {
  results: AppliedFix[]
  totalAffected: number
  errors?: string[]
}

/**
 * An applied fix with status
 */
export interface AppliedFix extends ConsistencyFix {
  applied: boolean
  appliedAt?: number
  error?: string
}

/**
 * Story context for consistency checking
 */
export interface StoryContext {
  projectId: string
  episodeId?: string
  characters: Record<string, unknown>[]
  beats: Record<string, unknown>[]
  episodes?: Record<string, unknown>[]
  seriesBible?: Record<string, unknown>
  worldRules?: Record<string, unknown>[]
  recentChanges?: Record<string, unknown>[]
}

/**
 * Undo action for consistency fixes
 */
export interface UndoAction {
  id: string
  type: 'consistency_fix'
  fixes: ConsistencyFix[]
  appliedFixes: AppliedFix[]
  timestamp: number
}

/**
 * Consistency check request
 */
export interface ConsistencyCheckRequest {
  projectId: string
  episodeId?: string
  trigger: {
    type: 'action' | 'manual' | 'approval'
    action?: unknown
    context: StoryContext
  }
}

/**
 * Consistency message for chat UI
 */
export interface ConsistencyChatMessage {
  type: 'consistency_check'
  checkId: string
  result: ConsistencyCheckResult
  canUndo: boolean
}
