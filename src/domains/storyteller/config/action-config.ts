/**
 * Action Configuration - Centralized mapping between sections, actions, and fields
 *
 * This provides a single source of truth for:
 * - Bible section names
 * - Action types
 * - Field names in tool results
 * - Payload extraction logic
 */

import { ActionType, BibleSection } from '../enums'

// ============================================
// Deep Merge Utility
// ============================================

/**
 * Deep merge objects, handling nested objects while replacing arrays
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key]
    const targetVal = target[key]

    // Skip undefined/null source values
    if (sourceVal === undefined || sourceVal === null) continue

    // If both are plain objects (not arrays), merge recursively
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal as any)
    } else {
      // Otherwise replace (including arrays)
      result[key] = sourceVal as T[keyof T]
    }
  }

  return result
}

// ============================================
// Section Configuration
// ============================================

export interface SectionConfig {
  /** The Bible section this config applies to */
  section: BibleSection
  /** The action type to emit for this section */
  actionType: ActionType
  /** Field names that indicate this section in tool results */
  fieldNames: string[]
  /** Whether this action requires user approval */
  requiresApproval: boolean
  /** Extract payload from tool result fields */
  extractPayload: (fields: Record<string, unknown>, episodeId?: string | null) => Record<string, unknown>
}

/**
 * Central configuration for all Bible sections
 */
export const SECTION_CONFIGS: SectionConfig[] = [
  // Generic bible update - handles any unrecognized fields
  {
    section: BibleSection.FULL,
    actionType: ActionType.UPDATE_SERIES_BIBLE,
    fieldNames: [], // Empty - this is the fallback, matched by actionType not fieldNames
    requiresApproval: true,
    extractPayload: fields => ({ updatedFields: fields }),
  },
  {
    section: BibleSection.SOUNDTRACKS,
    actionType: ActionType.UPDATE_SOUNDTRACKS,
    fieldNames: ['soundtracks', 'tracks', 'music', 'soundtrack'],
    requiresApproval: true,
    extractPayload: fields => ({
      soundtracks: fields.soundtracks || fields.tracks || fields.music || fields.soundtrack,
    }),
  },
  {
    section: BibleSection.MOODBOARD,
    actionType: ActionType.UPDATE_MOODBOARD,
    fieldNames: ['moodImages', 'moodboard'],
    requiresApproval: false, // Moodboard updates don't need approval (async generation)
    extractPayload: fields => ({ moodImages: fields.moodImages || fields.moodboard }),
  },
  {
    section: BibleSection.WORLD_RULES,
    actionType: ActionType.UPDATE_WORLD_RULES,
    fieldNames: ['worldRules', 'rules', 'world_rules'],
    requiresApproval: true,
    extractPayload: fields => ({
      worldRules: fields.worldRules || fields.rules || fields.world_rules,
    }),
  },
  {
    section: BibleSection.FACTIONS,
    actionType: ActionType.UPDATE_FACTIONS,
    fieldNames: ['factions'],
    requiresApproval: true,
    extractPayload: fields => ({ factions: fields.factions }),
  },
  {
    section: BibleSection.INSPIRATIONS,
    actionType: ActionType.UPDATE_INSPIRATIONS,
    fieldNames: ['inspirations'],
    requiresApproval: true,
    extractPayload: fields => ({ inspirations: fields.inspirations }),
  },
  {
    section: BibleSection.CAST,
    actionType: ActionType.UPDATE_CAST,
    fieldNames: ['cast', 'characters', 'keyCharacters', 'key_characters'], // Multiple aliases for backwards compat
    requiresApproval: true,
    extractPayload: fields => ({
      cast: fields.cast || fields.characters || fields.keyCharacters || fields.key_characters,
    }),
  },
  {
    section: BibleSection.WORLD_DESCRIPTION,
    actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
    fieldNames: ['worldDescription', 'description', 'world_description', 'overview'],
    requiresApproval: true,
    extractPayload: fields => ({
      worldDescription:
        fields.worldDescription ||
        fields.description ||
        fields.world_description ||
        fields.overview,
    }),
  },
  {
    section: BibleSection.PLOT_TWISTS,
    actionType: ActionType.UPDATE_PLOT_TWISTS,
    fieldNames: ['plotTwists', 'twists', 'plot_twists'],
    requiresApproval: true,
    extractPayload: fields => ({
      plotTwists: fields.plotTwists || fields.twists || fields.plot_twists,
    }),
  },
  {
    section: BibleSection.EPISODE_PREMISE,
    actionType: ActionType.UPDATE_EPISODE_PREMISE,
    fieldNames: ['episodePremise', 'premise'],
    requiresApproval: true,
    extractPayload: (fields, episodeId) => ({
      episodeId: episodeId || null,
      premise: fields.episodePremise || fields.premise,
    }),
  },
  {
    section: BibleSection.EPISODE_ROADMAP,
    actionType: ActionType.UPDATE_EPISODE_ROADMAP,
    fieldNames: ['sequences', 'episodeRoadmap'],
    requiresApproval: true,
    extractPayload: fields => {
      const roadmapData = fields.episodeRoadmap || { sequences: fields.sequences }
      return {
        seasonStructure: roadmapData.seasonStructure,
        sequences: roadmapData.sequences || fields.sequences,
        executiveSummary: roadmapData.executiveSummary,
      }
    },
  },
]

// ============================================
// Lookup Utilities
// ============================================

/**
 * Find section config by matching field names from tool result
 */
export function findSectionConfigByFields(fieldKeys: string[]): SectionConfig | null {
  return (
    SECTION_CONFIGS.find(config =>
      config.fieldNames.some(fieldName => fieldKeys.includes(fieldName))
    ) || null
  )
}

/**
 * Find section config by action type
 */
export function findSectionConfigByAction(actionType: string): SectionConfig | null {
  return SECTION_CONFIGS.find(config => config.actionType === actionType) || null
}

/**
 * Find section config by section enum
 */
export function findSectionConfigBySection(section: BibleSection): SectionConfig | null {
  return SECTION_CONFIGS.find(config => config.section === section) || null
}

/**
 * Get action type for a section
 */
export function getActionTypeForSection(section: BibleSection): ActionType {
  const config = findSectionConfigBySection(section)
  return config?.actionType || ActionType.UPDATE_SERIES_BIBLE
}

/**
 * Get section for an action type
 */
export function getSectionForActionType(actionType: string): BibleSection | null {
  const config = findSectionConfigByAction(actionType)
  return config?.section || null
}

// ============================================
// Action Processing
// ============================================

export interface ProcessedAction {
  actionType: ActionType
  payload: Record<string, unknown>
  section: BibleSection
  requiresApproval: boolean
}

/**
 * Process tool result fields into a structured action
 */
export function processToolResultToAction(
  toolName: string,
  fields: Record<string, unknown>,
  episodeId?: string | null
): ProcessedAction | null {
  if (toolName !== 'update_world_bible') {
    return null
  }

  const fieldKeys = Object.keys(fields)
  const config = findSectionConfigByFields(fieldKeys)

  if (!config) {
    // Fallback to generic bible update
    return {
      actionType: ActionType.UPDATE_SERIES_BIBLE,
      payload: { updatedFields: fields },
      section: BibleSection.FULL,
      requiresApproval: true,
    }
  }

  return {
    actionType: config.actionType,
    payload: config.extractPayload(fields, episodeId),
    section: config.section,
    requiresApproval: config.requiresApproval,
  }
}

// ============================================
// State Update Utilities
// ============================================

/**
 * Fields that should be directly merged into storyPlan
 */
export const STORY_PLAN_FIELDS = [
  'soundtracks',
  'worldRules',
  'factions',
  'cast', // Project-level cast (replaces keyCharacters)
  'plotTwists',
  'inspirations',
  'worldDescription',
  'genre',
  'tone',
  'sequences',
  'seasonStructure',
  'executiveSummary',
  'moodImages',
  'moodboard',
  'masterPrompt',
  'centralTheme',
] as const

/**
 * Apply updates to a story plan state, handling merging correctly
 */
export function applyUpdatesToStoryPlan<T extends Record<string, any>>(
  currentPlan: T | null,
  updates: Record<string, unknown>
): T {
  const result = { ...(currentPlan || {}) } as T

  // Apply standard plan fields
  for (const field of STORY_PLAN_FIELDS) {
    if (updates[field] !== undefined) {
      ;(result as any)[field] = updates[field]
    }
  }

  // Handle cast field aliases (cast is the canonical field)
  const cast = updates.cast || updates.characters
  if (cast) {
    ;(result as any).cast = cast
  }

  // Handle moodboard/moodImages aliases
  const moodImages = updates.moodImages || updates.moodboard
  if (moodImages) {
    ;(result as any).moodImages = moodImages
  }

  // Handle episode premise - MERGE, don't replace
  const premiseUpdate = updates.episodePremise || updates.premise
  if (premiseUpdate) {
    ;(result as any).premise = deepMerge((currentPlan as any)?.premise || {}, premiseUpdate)
  }

  return result
}

// ============================================
// Approval Configuration
// ============================================

/**
 * Action types that always require user approval
 */
export const APPROVAL_REQUIRED_ACTIONS: ActionType[] = [
  ActionType.UPDATE_SERIES_BIBLE,
  ActionType.UPDATE_EPISODE_ROADMAP,
  ActionType.UPDATE_WORLD_RULES,
  ActionType.UPDATE_SOUNDTRACKS,
  ActionType.UPDATE_FACTIONS,
  ActionType.UPDATE_INSPIRATIONS,
  ActionType.UPDATE_CAST, // Project-level cast
  ActionType.UPDATE_WORLD_DESCRIPTION,
  ActionType.UPDATE_PLOT_TWISTS,
  ActionType.UPDATE_EPISODE_PREMISE,
  ActionType.CREATE_BEAT,
  ActionType.UPDATE_BEAT,
]

/**
 * Check if an action type requires approval
 */
export function actionRequiresApproval(actionType: string, status?: string): boolean {
  return APPROVAL_REQUIRED_ACTIONS.includes(actionType as ActionType) || status === 'pending'
}
