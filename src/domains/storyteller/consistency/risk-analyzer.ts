/**
 * Risk Analyzer
 *
 * Analyzes story changes to determine if consistency checking is needed.
 * Uses smart detection to avoid unnecessary checks.
 */

import { ChangeRisk, StoryContext } from './types'
import { AgentAction } from '../actions/types'
import { CharacterState } from '../types'

/**
 * Analyze the risk level of a story change
 */
export function analyzeChangeRisk(action: AgentAction, context: StoryContext): ChangeRisk {
  const actionType = action.type
  const payload = action.payload || {}

  // HIGH RISK: Changes that frequently cause inconsistencies
  const highRiskActions = [
    'UPDATE_CHARACTER',
    'ADD_BEAT',
    'UPDATE_BEAT',
    'DELETE_BEAT',
    'REORDER_BEATS',
    'UPDATE_WORLD_RULES',
    'UPDATE_EPISODE_PREMISE',
    'ADD_CHARACTER',
  ]

  // MEDIUM RISK: Changes that sometimes cause issues
  const mediumRiskActions = [
    'UPDATE_CHARACTER_PSYCHOLOGY',
    'UPDATE_FACTION',
    'ADD_FACTION',
    'UPDATE_STORY_PLAN',
  ]

  // Analyze based on action type
  if (highRiskActions.includes(actionType)) {
    return analyzeHighRiskAction(action, context)
  }

  if (mediumRiskActions.includes(actionType)) {
    return analyzeMediumRiskAction(action, context)
  }

  // LOW RISK: Dialogue, descriptions, minor tweaks
  return {
    level: 'low',
    reason: 'Low-impact change unlikely to cause inconsistencies',
    affectedElements: [],
    shouldCheck: false,
  }
}

/**
 * Analyze high-risk actions in detail
 */
function analyzeHighRiskAction(action: AgentAction, context: StoryContext): ChangeRisk {
  const { type, payload } = action
  const affectedElements: string[] = []
  let reason = ''

  switch (type) {
    case 'UPDATE_CHARACTER':
      affectedElements.push(`character:${payload.characterId}`)

      // Check if psychology/traits changed
      const charUpdates = (payload.updates || {}) as Partial<CharacterState>
      if (
        charUpdates.currentGoals ||
        charUpdates.fears ||
        charUpdates.selfDelusion ||
        charUpdates.actualMotivation ||
        charUpdates.traits
      ) {
        reason = 'Character trait changes can create inconsistencies with existing beats'

        // Add all beats as potentially affected
        context.beats.forEach(b => affectedElements.push(`beat:${b.id}`))

        return {
          level: 'high',
          reason,
          affectedElements,
          shouldCheck: true,
        }
      }

      reason = 'Character update may affect story consistency'
      return {
        level: 'medium',
        reason,
        affectedElements,
        shouldCheck: context.beats.length > 3, // Only check if story is substantial
      }

    case 'ADD_BEAT':
    case 'UPDATE_BEAT':
      const beatId = (payload as any).beatId || (payload as any).id
      affectedElements.push(`beat:${beatId}`)

      // Check if this beat references characters
      const beatText = JSON.stringify(payload).toLowerCase()
      context.characters.forEach(char => {
        if (beatText.includes(char.name.toLowerCase())) {
          affectedElements.push(`character:${char.id}`)
        }
      })

      reason = 'Beat changes can create timeline or character inconsistencies'
      return {
        level: 'high',
        reason,
        affectedElements,
        shouldCheck: true,
      }

    case 'REORDER_BEATS':
      // Timeline reordering is high risk
      reason = 'Beat reordering can break cause-and-effect relationships'
      context.beats.forEach(b => affectedElements.push(`beat:${b.id}`))

      return {
        level: 'high',
        reason,
        affectedElements,
        shouldCheck: true,
      }

    case 'UPDATE_WORLD_RULES':
      reason = 'World rule changes can invalidate existing story beats'
      affectedElements.push('world_rules')
      context.beats.forEach(b => affectedElements.push(`beat:${b.id}`))

      return {
        level: 'high',
        reason,
        affectedElements,
        shouldCheck: context.beats.length > 0,
      }

    case 'UPDATE_EPISODE_PREMISE':
      reason = 'Premise changes can affect all episode elements'
      affectedElements.push('premise')
      context.beats.forEach(b => affectedElements.push(`beat:${b.id}`))
      context.characters.forEach(c => affectedElements.push(`character:${c.id}`))

      return {
        level: 'high',
        reason,
        affectedElements,
        shouldCheck: context.beats.length > 0,
      }

    case 'ADD_CHARACTER':
      affectedElements.push(`character:${payload.characterId || 'new'}`)
      reason = 'New character should be checked for consistency with world rules'

      return {
        level: 'medium',
        reason,
        affectedElements,
        shouldCheck: (context.worldRules?.length || 0) > 0,
      }

    default:
      return {
        level: 'high',
        reason: 'High-risk action requires consistency check',
        affectedElements,
        shouldCheck: true,
      }
  }
}

/**
 * Analyze medium-risk actions
 */
function analyzeMediumRiskAction(action: AgentAction, context: StoryContext): ChangeRisk {
  const { type, payload } = action
  const affectedElements: string[] = []

  switch (type) {
    case 'UPDATE_CHARACTER_PSYCHOLOGY':
      affectedElements.push(`character:${payload.characterId}`)

      return {
        level: 'medium',
        reason: 'Psychology changes may affect character consistency',
        affectedElements,
        shouldCheck: context.beats.length > 5, // Only check for established stories
      }

    case 'UPDATE_FACTION':
    case 'ADD_FACTION':
      affectedElements.push(`faction:${payload.factionId || 'new'}`)

      return {
        level: 'medium',
        reason: 'Faction changes may affect related characters and beats',
        affectedElements,
        shouldCheck: context.characters.length > 2,
      }

    default:
      return {
        level: 'medium',
        reason: 'Medium-risk change may require consistency check',
        affectedElements,
        shouldCheck: false,
      }
  }
}

/**
 * Determine if a consistency check should run based on context
 */
export function shouldRunConsistencyCheck(risk: ChangeRisk, context: StoryContext): boolean {
  // Don't check if explicitly marked as shouldn't check
  if (!risk.shouldCheck) return false

  // Don't check for low risk
  if (risk.level === 'low') return false

  // Always check high risk
  if (risk.level === 'high') return true

  // For medium risk, check if story is substantial enough
  if (risk.level === 'medium') {
    const hasSubstantialStory = context.beats.length > 3 || context.characters.length > 2
    return hasSubstantialStory
  }

  return false
}

/**
 * Get a human-readable description of the risk
 */
export function getRiskDescription(risk: ChangeRisk): string {
  const levelEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  }

  return `${levelEmoji[risk.level]} ${risk.level.toUpperCase()}: ${risk.reason}`
}
