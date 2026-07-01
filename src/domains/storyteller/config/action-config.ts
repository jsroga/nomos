/**
 * Action Configuration - Centralized mapping between sections, actions, and fields
 *
 * This provides a single source of truth for:
 * - Bible section names
 * - Action types
 * - Field names in tool results
 * - Payload extraction logic
 */

import { ActionType, BibleSection } from '@/domains/storyteller/core/Enums'
import { deepMerge, smartMergeArray } from '@/domains/storyteller/core/DeepMerge'
import {
  extractCastFromUpdates,
  normalizeCastInUpdates,
  readCastFromPlan,
} from '@/domains/storyteller/core/StoryPlanFields'

// Re-export merge helpers for callers and tests
export { deepMerge, smartMergeArray } from '@/domains/storyteller/core/DeepMerge'

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
    extractPayload: fields => ({
      // Pass the whole object as-is, just like other sections
      // Normalize 'sequences' to 'episodes' key — BibleRoadmap reads episodeRoadmap.episodes
      episodeRoadmap: fields.episodeRoadmap || {
        episodes: fields.sequences,
        seasonStructure: fields.seasonStructure,
        executiveSummary: fields.executiveSummary,
      },
    }),
  },
  {
    section: BibleSection.ITEMS,
    actionType: ActionType.UPDATE_ITEMS,
    fieldNames: ['items'],
    requiresApproval: true,
    extractPayload: fields => ({ items: fields.items }),
  },
  {
    section: BibleSection.EVENTS,
    actionType: ActionType.UPDATE_EVENTS,
    fieldNames: ['events'],
    requiresApproval: true,
    extractPayload: fields => ({ events: fields.events }),
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
  'episodeRoadmap',
  'items',
  'events',
] as const

/**
 * Apply updates to a story plan state, handling merging correctly
 */
export function applyUpdatesToStoryPlan<T extends Record<string, any>>(
  currentPlan: T | null,
  updates: Record<string, unknown>
): T {
  const normalizedUpdates = normalizeCastInUpdates(updates)
  const result = { ...(currentPlan || {}) } as T

  // Apply standard plan fields
  for (const field of STORY_PLAN_FIELDS) {
    if (normalizedUpdates[field] !== undefined) {
      if (typeof normalizedUpdates[field] === 'object' && normalizedUpdates[field] !== null && !Array.isArray(normalizedUpdates[field])) {
        ; (result as any)[field] = deepMerge((currentPlan as any)?.[field] || {}, normalizedUpdates[field] as any)
      } else if (Array.isArray(normalizedUpdates[field])) {
        const currentArr = Array.isArray((currentPlan as any)?.[field]) ? (currentPlan as any)[field] : []
          ; (result as any)[field] = smartMergeArray(currentArr, normalizedUpdates[field] as any[])
      } else {
        ; (result as any)[field] = normalizedUpdates[field]
      }
    }
  }

  const cast = extractCastFromUpdates(normalizedUpdates)
  if (cast) {
    const currentCast = readCastFromPlan(currentPlan as Record<string, unknown>)
    const mergedCast = Array.isArray(cast) ? smartMergeArray(currentCast, cast) : cast
    ; (result as any).cast = mergedCast
    ; (result as any).keyCharacters = mergedCast
  }

  // Handle moodboard/moodImages aliases
  const moodImages = normalizedUpdates.moodImages || normalizedUpdates.moodboard
  if (moodImages) {
    ; (result as any).moodImages = moodImages
  }

  // Handle episode premise - MERGE, don't replace
  const premiseUpdate = normalizedUpdates.episodePremise || normalizedUpdates.premise
  if (premiseUpdate) {
    ; (result as any).premise = deepMerge((currentPlan as any)?.premise || {}, premiseUpdate as Record<string, unknown>)
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
