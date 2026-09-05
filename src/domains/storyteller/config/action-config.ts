/**
 * Action Configuration - Centralized mapping between sections, actions, and fields
 *
 * This provides a single source of truth for:
 * - Bible section names
 * - Action types
 * - Field names in tool results
 * - Payload extraction logic
 */

import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { deepMerge, recordFromJson, smartMergeArray } from '@/shared/data/deep-merge'
import {
  MergeStrategy,
  mergeStrategyFor,
} from '@/domains/storyteller/core/bible/section-registry'
import {
  extractCastFromUpdates,
  normalizeCastInUpdates,
} from '@/domains/storyteller/core/formatting/story-plan-fields'
import {
  EpisodePremiseFieldAlias,
  EpisodeRoadmapFieldAlias,
  MoodboardFieldAlias,
  PlotTwistFieldAlias,
  SoundtrackFieldAlias,
  STORY_PLAN_MERGE_FIELDS,
  WorldDescriptionFieldAlias,
  WorldRulesFieldAlias,
} from './constants/bible-wire-fields'

// Re-export merge helpers for callers and tests
export { deepMerge, smartMergeArray } from '@/shared/data/deep-merge'

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
    fieldNames: [
      SoundtrackFieldAlias.Soundtracks,
      SoundtrackFieldAlias.Tracks,
      SoundtrackFieldAlias.Music,
      SoundtrackFieldAlias.Soundtrack,
      SoundtrackFieldAlias.MoodSoundtrack,
    ],
    requiresApproval: true,
    extractPayload: fields => ({
      soundtracks:
        fields[SoundtrackFieldAlias.Soundtracks] ||
        fields[SoundtrackFieldAlias.Tracks] ||
        fields[SoundtrackFieldAlias.Music] ||
        fields[SoundtrackFieldAlias.Soundtrack],
      moodSoundtrack: fields[SoundtrackFieldAlias.MoodSoundtrack],
    }),
  },
  {
    section: BibleSection.MOODBOARD,
    actionType: ActionType.UPDATE_MOODBOARD,
    fieldNames: [MoodboardFieldAlias.MoodImages, MoodboardFieldAlias.Moodboard],
    requiresApproval: false, // Moodboard updates don't need approval (async generation)
    extractPayload: fields => ({
      moodImages: fields[MoodboardFieldAlias.MoodImages] || fields[MoodboardFieldAlias.Moodboard],
    }),
  },
  {
    section: BibleSection.WORLD_RULES,
    actionType: ActionType.UPDATE_WORLD_RULES,
    fieldNames: [WorldRulesFieldAlias.WorldRules, WorldRulesFieldAlias.Rules, WorldRulesFieldAlias.WorldRulesSnake],
    requiresApproval: true,
    extractPayload: fields => ({
      worldRules:
        fields[WorldRulesFieldAlias.WorldRules] ||
        fields[WorldRulesFieldAlias.Rules] ||
        fields[WorldRulesFieldAlias.WorldRulesSnake],
    }),
  },
  {
    section: BibleSection.FACTIONS,
    actionType: ActionType.UPDATE_FACTIONS,
    fieldNames: [BibleSection.FACTIONS],
    requiresApproval: true,
    extractPayload: fields => ({ factions: fields[BibleSection.FACTIONS] }),
  },
  {
    section: BibleSection.INSPIRATIONS,
    actionType: ActionType.UPDATE_INSPIRATIONS,
    fieldNames: [BibleSection.INSPIRATIONS],
    requiresApproval: true,
    extractPayload: fields => ({ inspirations: fields[BibleSection.INSPIRATIONS] }),
  },
  {
    section: BibleSection.CAST,
    actionType: ActionType.UPDATE_CAST,
    fieldNames: [
      CastFieldAlias.Cast,
      CastFieldAlias.Characters,
      CastFieldAlias.KeyCharacters,
      CastFieldAlias.KeyCharactersSnake,
    ],
    requiresApproval: true,
    extractPayload: fields => ({
      cast:
        fields[CastFieldAlias.Cast] ||
        fields[CastFieldAlias.Characters] ||
        fields[CastFieldAlias.KeyCharacters] ||
        fields[CastFieldAlias.KeyCharactersSnake],
    }),
  },
  {
    section: BibleSection.WORLD_DESCRIPTION,
    actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
    fieldNames: [
      WorldDescriptionFieldAlias.WorldDescription,
      WorldDescriptionFieldAlias.Description,
      WorldDescriptionFieldAlias.WorldDescriptionSnake,
      WorldDescriptionFieldAlias.Overview,
    ],
    requiresApproval: true,
    extractPayload: fields => ({
      worldDescription:
        fields[WorldDescriptionFieldAlias.WorldDescription] ||
        fields[WorldDescriptionFieldAlias.Description] ||
        fields[WorldDescriptionFieldAlias.WorldDescriptionSnake] ||
        fields[WorldDescriptionFieldAlias.Overview],
    }),
  },
  {
    section: BibleSection.PLOT_TWISTS,
    actionType: ActionType.UPDATE_PLOT_TWISTS,
    fieldNames: [
      PlotTwistFieldAlias.PlotTwists,
      PlotTwistFieldAlias.Twists,
      PlotTwistFieldAlias.PlotTwistsSnake,
    ],
    requiresApproval: true,
    extractPayload: fields => ({
      plotTwists:
        fields[PlotTwistFieldAlias.PlotTwists] ||
        fields[PlotTwistFieldAlias.Twists] ||
        fields[PlotTwistFieldAlias.PlotTwistsSnake],
    }),
  },
  {
    section: BibleSection.EPISODE_PREMISE,
    actionType: ActionType.UPDATE_EPISODE_PREMISE,
    fieldNames: [EpisodePremiseFieldAlias.EpisodePremise, EpisodePremiseFieldAlias.Premise],
    requiresApproval: true,
    extractPayload: (fields, episodeId) => ({
      episodeId: episodeId || null,
      premise:
        fields[EpisodePremiseFieldAlias.EpisodePremise] || fields[EpisodePremiseFieldAlias.Premise],
    }),
  },
  {
    section: BibleSection.EPISODE_ROADMAP,
    actionType: ActionType.UPDATE_EPISODE_ROADMAP,
    fieldNames: [EpisodeRoadmapFieldAlias.Sequences, EpisodeRoadmapFieldAlias.EpisodeRoadmap],
    requiresApproval: true,
    extractPayload: fields => ({
      episodeRoadmap: fields[EpisodeRoadmapFieldAlias.EpisodeRoadmap] || {
        episodes: fields[EpisodeRoadmapFieldAlias.Sequences],
        seasonStructure: fields[EpisodeRoadmapFieldAlias.SeasonStructure],
        executiveSummary: fields[EpisodeRoadmapFieldAlias.ExecutiveSummary],
      },
    }),
  },
  {
    section: BibleSection.ITEMS,
    actionType: ActionType.UPDATE_ITEMS,
    fieldNames: [BibleSection.ITEMS],
    requiresApproval: true,
    extractPayload: fields => ({ items: fields[BibleSection.ITEMS] }),
  },
  {
    section: BibleSection.EVENTS,
    actionType: ActionType.UPDATE_EVENTS,
    fieldNames: [BibleSection.EVENTS],
    requiresApproval: true,
    extractPayload: fields => ({ events: fields[BibleSection.EVENTS] }),
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
  if (toolName !== StorytellerChatTool.UpdateWorldBible) {
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
export const STORY_PLAN_FIELDS = STORY_PLAN_MERGE_FIELDS

/**
 * Apply updates to a story plan state, handling merging correctly
 */
/**
 * Bible arrays replace; bible objects deep-merge. SECTION_REGISTRY declares
 * that per section. World-level scalars and episode fields still follow value
 * shape (array identity-merge, object deep-merge, scalar overwrite).
 */
function mergePlanField(field: string, currentValue: unknown, update: unknown): unknown {
  if (Array.isArray(update)) {
    if (mergeStrategyFor(field) === MergeStrategy.Replace) return update
    return smartMergeArray(Array.isArray(currentValue) ? currentValue : [], update)
  }
  if (typeof update === 'object' && update !== null) {
    return deepMerge(recordFromJson(currentValue), recordFromJson(update))
  }
  return update
}

export function applyUpdatesToStoryPlan<T extends object>(
  currentPlan: T | null,
  updates: Record<string, unknown>
): T & Record<string, unknown> {
  const normalizedUpdates = normalizeCastInUpdates(updates)
  // Merge on an untyped view; the typed shape is restored via Object.assign at the end.
  const current = recordFromJson(currentPlan)
  const result: Record<string, unknown> = { ...current }

  // Apply standard plan fields
  for (const field of STORY_PLAN_FIELDS) {
    const update = normalizedUpdates[field]
    if (update === undefined) continue
    result[field] = mergePlanField(field, current[field], update)
  }

  const cast = extractCastFromUpdates(normalizedUpdates)
  if (cast) {
    result[CastFieldAlias.Cast] = cast
    result[CastFieldAlias.KeyCharacters] = cast
  }

  // Handle moodboard/moodImages aliases
  const moodImages = normalizedUpdates[MoodboardFieldAlias.MoodImages] || normalizedUpdates[MoodboardFieldAlias.Moodboard]
  if (moodImages) {
    result[MoodboardFieldAlias.MoodImages] = moodImages
  }

  // Handle episode premise - MERGE, don't replace
  const premiseUpdate =
    normalizedUpdates[EpisodePremiseFieldAlias.EpisodePremise] ||
    normalizedUpdates[EpisodePremiseFieldAlias.Premise]
  if (premiseUpdate) {
    result[EpisodePremiseFieldAlias.Premise] =
      typeof premiseUpdate === 'object' && !Array.isArray(premiseUpdate)
        ? deepMerge(recordFromJson(current[EpisodePremiseFieldAlias.Premise]), recordFromJson(premiseUpdate))
        : premiseUpdate
  }

  return Object.assign({}, currentPlan, result)
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
  return APPROVAL_REQUIRED_ACTIONS.some(action => action === actionType) || status === ApprovalActionStatus.PENDING
}
