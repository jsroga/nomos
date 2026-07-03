/**
 * Tool-result → UI action mapping for the storyteller chat stream.
 *
 * Pure functions extracted from the chat stream route so the mapping logic is
 * unit-testable in isolation. The route handles the surrounding I/O
 * (entity auto-linking, dedup, SSE emission).
 */

import { ActionType, BibleSection } from '@/domains/storyteller/core/types/Enums'
import { processToolResultToAction, getActionTypeForSection } from './action-config'

export type DetectedSection = BibleSection | 'beats'

export type ToolResultOutcome =
  | { kind: 'questions'; questions: unknown[] }
  | { kind: 'info'; message: string; data: unknown }
  | { kind: 'navigation'; action: string; episodeId?: string | null }
  | {
      kind: 'action'
      actionType: string
      actionPayload: Record<string, unknown>
      requiresApproval: boolean
      detectedSection: DetectedSection
    }
  | { kind: 'none' }

/** Section keys recognised in update tool args (for the section_loading shimmer). */
const SECTION_KEYS = [
  'soundtracks',
  'worldRules',
  'factions',
  'inspirations',
  'keyCharacters',
  'worldDescription',
  'plotTwists',
  'episodePremise',
  'episodeRoadmap',
  'sequences',
  'premise',
  'characters',
  'cast',
  'protagonistHook',
  'fatalFlaw',
  'stakes',
  'inevitableConsequence',
  'theHook',
  'theTurn',
  'theAftermath',
  'transformation',
  'thematicFocus',
  'logline',
  'title',
]

const PREMISE_SECTIONS = [
  'protagonistHook',
  'fatalFlaw',
  'stakes',
  'inevitableConsequence',
  'theHook',
  'theTurn',
  'theAftermath',
  'transformation',
  'thematicFocus',
  'logline',
  'title',
]

/**
 * Determine which bible section a tool call is loading, for the UI shimmer.
 * Returns the normalized section name, or null if not applicable.
 */
export function detectLoadingSection(
  toolName: string,
  toolArgs: Record<string, any>
): string | null {
  if (toolName !== 'update_world_bible' && toolName !== 'consult_premise_architect') {
    return null
  }

  let argSection = toolArgs.section || Object.keys(toolArgs).find(k => SECTION_KEYS.includes(k))

  if (argSection && PREMISE_SECTIONS.includes(argSection)) {
    // Regenerating an individual premise field → show shimmer on the premise panel
    argSection = 'episodePremise'
  }

  if (!argSection) return null

  return argSection === 'characters' || argSection === 'cast' ? 'keyCharacters' : argSection
}

/**
 * Deduplication key for an action.
 * Format: toolName:section:contentHash (beats keyed by id/title).
 */
export function getActionDedupeKey(
  toolName: string,
  section: string,
  payload: Record<string, unknown>
): string {
  if (toolName === 'manage_beat') {
    const beatId = (payload as any)?.id || (payload as any)?.beatId || (payload as any)?.beat?.id
    const beatTitle = (payload as any)?.title || (payload as any)?.beat?.title || 'untitled'
    return `manage_beat:${beatId || beatTitle}`
  }

  if (toolName === 'update_world_bible') {
    const contentPreview = JSON.stringify(payload || {}).slice(0, 100)
    return `${toolName}:${section}:${contentPreview}`
  }

  const payloadKeys = Object.keys(payload || {})
    .sort()
    .join(',')
  return `${toolName}:${section}:${payloadKeys}`
}

/**
 * Map a parsed tool result to a UI outcome (action, question, info, navigation,
 * or none). Pure: all I/O is left to the caller.
 */
export function mapToolResultToAction(args: {
  toolName: string
  parsed: any
  episodeId?: string | null
  isSectionUpdate: boolean
  currentSection: DetectedSection
}): ToolResultOutcome {
  const { toolName, parsed, episodeId, isSectionUpdate, currentSection } = args

  // Interactive question tools — emitted as question events, not actions
  if (toolName === 'ask_character_questions' && parsed?.type === 'questions') {
    return {
      kind: 'questions',
      questions: parsed.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        urgency: 'normal',
        context: `Character: ${parsed.characterName}`,
      })),
    }
  }

  if (toolName === 'ask_continue_to_beats' && parsed?.type === 'questions') {
    return {
      kind: 'questions',
      questions: parsed.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options || [],
        urgency: 'normal',
        context: parsed.context,
      })),
    }
  }

  let actionType: string | null = null
  let actionPayload: Record<string, unknown> = {}
  let requiresApproval = false
  let detectedSection: DetectedSection = currentSection

  // consult_premise_architect returns episodePremise (not success)
  if (toolName === 'consult_premise_architect' && parsed?.episodePremise) {
    actionType = 'UPDATE_EPISODE_PREMISE'
    actionPayload = { episodeId: episodeId || null, premise: parsed.episodePremise }
    requiresApproval = true
  } else if (parsed?.success) {
    if (toolName === 'update_world_bible') {
      const fields = parsed.updatedFields || {}
      const processedAction = processToolResultToAction(toolName, fields, episodeId)
      if (processedAction) {
        actionType = processedAction.actionType
        actionPayload = processedAction.payload
        requiresApproval = processedAction.requiresApproval
        detectedSection = processedAction.section
      }
    } else if (toolName === 'manage_beat' && parsed.beat) {
      const operation = parsed.message?.toLowerCase() || ''
      const beatActions: Record<
        string,
        { type: ActionType; payload: Record<string, unknown>; approval: boolean }
      > = {
        created: { type: ActionType.CREATE_BEAT, payload: parsed.beat, approval: true },
        updated: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: parsed.beat.id, updates: parsed.beat },
          approval: true,
        },
        deleted: {
          type: ActionType.DELETE_BEAT,
          payload: { beatId: parsed.deletedId || parsed.beat?.id },
          approval: false,
        },
        approved: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: parsed.beat?.id, updates: { status: parsed.status } },
          approval: false,
        },
        locked: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: parsed.beat?.id, updates: { status: parsed.status } },
          approval: false,
        },
      }

      const matchedAction = Object.entries(beatActions).find(([key]) => operation.includes(key))
      if (matchedAction) {
        const [, config] = matchedAction
        actionType = config.type
        actionPayload = config.payload
        requiresApproval = config.approval
        detectedSection = 'beats'
      }
    } else if (toolName === 'update_story_phase') {
      actionType = ActionType.UPDATE_STORY_PHASE
      actionPayload = { phase: parsed.phase }
    } else if (toolName === 'create_character' && parsed.character) {
      actionType = ActionType.CREATE_CHARACTER
      actionPayload = parsed.character
      requiresApproval = false
    } else if (toolName === 'create_episode' && parsed.episode) {
      return {
        kind: 'info',
        message: parsed.message || `Episode created: ${parsed.episode.title}`,
        data: parsed.episode,
      }
    } else if (toolName === 'start_beat_planning' && parsed.type === 'navigation') {
      return { kind: 'navigation', action: parsed.action, episodeId: parsed.episodeId }
    }
  }

  // FALLBACK: detected section update but no action mapped → generic section action
  if (!actionType && isSectionUpdate && toolName === 'update_world_bible') {
    actionType = getActionTypeForSection(detectedSection as BibleSection)
    actionPayload = parsed?.updatedFields || parsed || {}
    requiresApproval = true
  }

  if (!actionType) return { kind: 'none' }

  return { kind: 'action', actionType, actionPayload, requiresApproval, detectedSection }
}
