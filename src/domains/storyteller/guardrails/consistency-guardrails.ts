/**
 * Consistency Guardrails
 *
 * Cross-references agent outputs against the series bible to ensure
 * characters, factions, and world rules are consistent.
 */

import { AgentAction } from '../actions/types'
import { WritersRoomState, BeatCard } from '../types'
import {
  ConsistencyCheckResult,
  ConsistencyCheckType,
  GuardrailIssue,
  SeriesBibleRef,
} from './types'

// ============================================
// BIBLE EXTRACTION HELPERS
// ============================================

/**
 * Extract a normalized SeriesBibleRef from the WritersRoomState
 */
export function extractBibleRef(state: WritersRoomState): SeriesBibleRef {
  const bible = state.seriesBible || {}
  const storyPlan = bible.storyPlan || bible

  // Get characters from multiple sources
  const characters: SeriesBibleRef['characters'] = []

  // From state.characters
  if (state.characters?.length) {
    state.characters.forEach(c => {
      characters.push({ name: c.name, id: c.characterId })
    })
  }

  // From bible.keyCharacters
  const keyChars = storyPlan.keyCharacters || bible.keyCharacters || []
  keyChars.forEach((c: any) => {
    if (!characters.find(existing => existing.name.toLowerCase() === c.name.toLowerCase())) {
      characters.push({ name: c.name, factionId: c.factionId })
    }
  })

  // Get factions
  const factions: SeriesBibleRef['factions'] = (storyPlan.factions || bible.factions || []).map(
    (f: any) => ({
      id: f.id,
      name: f.name,
      ideology: f.ideology,
    })
  )

  // Get world rules
  const rawRules = storyPlan.worldRules || bible.worldRules || []
  const worldRules: SeriesBibleRef['worldRules'] = rawRules.map((r: any) => {
    if (typeof r === 'string') {
      return { rule: r }
    }
    return {
      category: r.category,
      rule: r.rule,
      consequence: r.consequence,
    }
  })

  return {
    characters,
    factions,
    worldRules,
  }
}

// ============================================
// CHARACTER VALIDATION
// ============================================

/**
 * Check if referenced characters exist in the bible
 */
export function checkCharactersExist(
  referencedNames: string[],
  bible: SeriesBibleRef
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []
  const knownNames = new Set(bible.characters.map(c => c.name.toLowerCase()))

  for (const name of referencedNames) {
    const normalizedName = name.toLowerCase()
    if (!knownNames.has(normalizedName)) {
      // Check for fuzzy matches
      const possibleMatches = bible.characters
        .filter(c => {
          const bibName = c.name.toLowerCase()
          return (
            bibName.includes(normalizedName) ||
            normalizedName.includes(bibName) ||
            levenshteinDistance(bibName, normalizedName) <= 2
          )
        })
        .map(c => c.name)

      issues.push({
        code: 'CHARACTER_NOT_FOUND',
        message: `Character "${name}" is not defined in the series bible`,
        severity: 'warning',
        field: 'charactersInvolved',
        context: {
          referencedName: name,
          possibleMatches,
          knownCharacters: bible.characters.map(c => c.name),
        },
      })
    }
  }

  return issues
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// ============================================
// FACTION VALIDATION
// ============================================

/**
 * Check if referenced factions exist in the bible
 */
export function checkFactionsExist(
  referencedFactions: string[],
  bible: SeriesBibleRef
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []
  const knownFactions = new Set([
    ...bible.factions.map(f => f.id.toLowerCase()),
    ...bible.factions.map(f => f.name.toLowerCase()),
  ])

  for (const faction of referencedFactions) {
    const normalizedFaction = faction.toLowerCase()
    if (!knownFactions.has(normalizedFaction)) {
      issues.push({
        code: 'FACTION_NOT_FOUND',
        message: `Faction "${faction}" is not defined in the series bible`,
        severity: 'warning',
        field: 'factionId',
        context: {
          referencedFaction: faction,
          knownFactions: bible.factions.map(f => f.name),
        },
      })
    }
  }

  return issues
}

/**
 * Check if factions have conflicting goals (required for good drama)
 */
export function checkFactionsHaveConflict(bible: SeriesBibleRef): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  if (bible.factions.length < 2) {
    issues.push({
      code: 'INSUFFICIENT_FACTIONS',
      message: 'Story needs at least 2 factions with conflicting goals for compelling drama',
      severity: 'info',
    })
  }

  // Check if factions have defined ideologies (necessary for conflict)
  const factionsWithoutIdeology = bible.factions.filter(f => !f.ideology)
  if (factionsWithoutIdeology.length > 0) {
    issues.push({
      code: 'FACTIONS_MISSING_IDEOLOGY',
      message: `Some factions lack defined ideologies: ${factionsWithoutIdeology.map(f => f.name).join(', ')}`,
      severity: 'warning',
      context: { factions: factionsWithoutIdeology.map(f => f.name) },
    })
  }

  return issues
}

// ============================================
// WORLD RULES VALIDATION
// ============================================

/**
 * Check if world rules have consequences defined
 */
export function checkWorldRulesHaveConsequences(bible: SeriesBibleRef): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  const rulesWithoutConsequences = bible.worldRules.filter(r => !r.consequence)
  if (rulesWithoutConsequences.length > 0) {
    issues.push({
      code: 'RULES_MISSING_CONSEQUENCES',
      message: `${rulesWithoutConsequences.length} world rule(s) lack defined consequences. Rules create conflict through their consequences.`,
      severity: 'info',
      context: {
        rules: rulesWithoutConsequences.map(r => r.rule),
      },
    })
  }

  return issues
}

// ============================================
// BEAT VALIDATION
// ============================================

/**
 * Check if a beat fits the current story phase
 */
export function checkBeatFitsPhase(beat: Partial<BeatCard>, phase: string): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  const beatTypePhaseMap: Record<string, string[]> = {
    setup: ['premise', 'breaking'],
    complication: ['breaking', 'cardlock'],
    revelation: ['breaking', 'cardlock'],
    decision: ['breaking', 'cardlock', 'writing'],
    consequence: ['breaking', 'cardlock', 'writing'],
  }

  if (beat.beatType) {
    const allowedPhases = beatTypePhaseMap[beat.beatType] || []
    if (!allowedPhases.includes(phase)) {
      issues.push({
        code: 'BEAT_PHASE_MISMATCH',
        message: `Beat type "${beat.beatType}" is unusual for the ${phase} phase`,
        severity: 'info',
        context: {
          beatType: beat.beatType,
          currentPhase: phase,
          recommendedPhases: allowedPhases,
        },
      })
    }
  }

  return issues
}

/**
 * Check character motivations align with their defined goals
 */
export function checkCharacterMotivationsAlign(
  beat: Partial<BeatCard>,
  bible: SeriesBibleRef,
  state: WritersRoomState
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  if (!beat.charactersInvolved) return issues

  for (const charName of beat.charactersInvolved) {
    // Find character in state
    const character = state.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())

    if (character && character.currentGoals.length > 0) {
      // This is a soft check - just noting when character actions might seem off
      // Real validation would need NLP to understand if the beat aligns with goals
      if (beat.logline && !beat.logline.toLowerCase().includes(charName.toLowerCase())) {
        issues.push({
          code: 'CHARACTER_NOT_IN_LOGLINE',
          message: `Character "${charName}" is listed as involved but not mentioned in the beat logline`,
          severity: 'info',
          context: {
            character: charName,
            goals: character.currentGoals,
          },
        })
      }
    }
  }

  return issues
}

// ============================================
// ACTION-SPECIFIC CONSISTENCY CHECKS
// ============================================

/**
 * Run consistency checks for a specific action
 */
export function checkActionConsistency(
  action: AgentAction,
  bible: SeriesBibleRef,
  state: WritersRoomState
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  switch (action.type) {
    case 'CREATE_BEAT': {
      const payload = action.payload as any
      if (payload.charactersInvolved) {
        issues.push(...checkCharactersExist(payload.charactersInvolved, bible))
      }
      issues.push(...checkBeatFitsPhase(payload, state.currentPhase))
      issues.push(...checkCharacterMotivationsAlign(payload, bible, state))
      break
    }

    case 'UPDATE_BEAT': {
      const payload = action.payload as any
      if (payload.updates?.charactersInvolved) {
        issues.push(...checkCharactersExist(payload.updates.charactersInvolved, bible))
      }
      break
    }

    case 'CREATE_CHARACTER': {
      const payload = action.payload as any
      // Check for duplicate character
      const existingChar = bible.characters.find(
        c => c.name.toLowerCase() === payload.name.toLowerCase()
      )
      if (existingChar) {
        issues.push({
          code: 'DUPLICATE_CHARACTER',
          message: `Character "${payload.name}" already exists`,
          severity: 'warning',
        })
      }
      break
    }

    case 'UPDATE_CHARACTER':
    case 'UPDATE_CHARACTER_METRICS':
    case 'ADD_KNOWLEDGE': {
      const payload = action.payload as any
      const charExists = state.characters.some(c => c.characterId === payload.characterId)
      if (!charExists) {
        issues.push({
          code: 'CHARACTER_ID_NOT_FOUND',
          message: `Character with ID "${payload.characterId}" not found in state`,
          severity: 'error',
        })
      }
      break
    }

    case 'UPDATE_KEY_CHARACTERS': {
      const payload = action.payload as any
      const chars = payload.keyCharacters || []
      for (const char of chars) {
        if (char.factionId) {
          issues.push(...checkFactionsExist([char.factionId], bible))
        }
      }
      break
    }

    case 'UPDATE_FACTIONS': {
      // Check that factions have required fields
      const payload = action.payload as any
      for (const faction of payload.factions || []) {
        if (!faction.ideology) {
          issues.push({
            code: 'FACTION_MISSING_IDEOLOGY',
            message: `Faction "${faction.name}" is missing an ideology`,
            severity: 'warning',
          })
        }
        if (!faction.goals || faction.goals.length === 0) {
          issues.push({
            code: 'FACTION_MISSING_GOALS',
            message: `Faction "${faction.name}" has no defined goals`,
            severity: 'warning',
          })
        }
      }
      break
    }
  }

  return issues
}

// ============================================
// MAIN CONSISTENCY CHECK FUNCTION
// ============================================

/**
 * Run all consistency checks for an agent output
 */
export async function checkConsistency(
  actions: AgentAction[],
  state: WritersRoomState,
  checksToRun: ConsistencyCheckType[] = []
): Promise<ConsistencyCheckResult> {
  const issues: GuardrailIssue[] = []
  const unreferencedEntities = {
    characters: [] as string[],
    factions: [] as string[],
    locations: [] as string[],
  }

  const bible = extractBibleRef(state)

  // Run action-specific checks
  for (const action of actions) {
    issues.push(...checkActionConsistency(action, bible, state))
  }

  // Run general consistency checks
  if (checksToRun.includes('factionsHaveConflict')) {
    issues.push(...checkFactionsHaveConflict(bible))
  }

  if (checksToRun.includes('worldRulesHaveConsequences')) {
    issues.push(...checkWorldRulesHaveConsequences(bible))
  }

  // Determine if any blocking issues exist
  const hasErrors = issues.some(i => i.severity === 'error')

  return {
    isConsistent: !hasErrors,
    issues,
    unreferencedEntities,
    suggestions: generateSuggestions(issues),
  }
}

/**
 * Generate helpful suggestions based on issues found
 */
function generateSuggestions(issues: GuardrailIssue[]): string[] {
  const suggestions: string[] = []

  const characterIssues = issues.filter(i => i.code === 'CHARACTER_NOT_FOUND')
  if (characterIssues.length > 0) {
    suggestions.push(
      'Consider adding missing characters to the series bible before referencing them in beats.'
    )
  }

  const factionIssues = issues.filter(i => i.code === 'FACTION_NOT_FOUND')
  if (factionIssues.length > 0) {
    suggestions.push(
      'Referenced factions should be defined in the world bible to maintain consistency.'
    )
  }

  if (issues.some(i => i.code === 'INSUFFICIENT_FACTIONS')) {
    suggestions.push('Add at least 2 factions with incompatible goals to create dramatic tension.')
  }

  return suggestions
}

// ============================================
// QUICK VALIDATION HELPERS
// ============================================

/**
 * Quick check if a character name exists
 */
export function characterExists(name: string, state: WritersRoomState): boolean {
  const bible = extractBibleRef(state)
  return bible.characters.some(c => c.name.toLowerCase() === name.toLowerCase())
}

/**
 * Quick check if a faction exists
 */
export function factionExists(factionIdOrName: string, state: WritersRoomState): boolean {
  const bible = extractBibleRef(state)
  const normalized = factionIdOrName.toLowerCase()
  return bible.factions.some(
    f => f.id.toLowerCase() === normalized || f.name.toLowerCase() === normalized
  )
}

/**
 * Get all known character names from state
 */
export function getKnownCharacterNames(state: WritersRoomState): string[] {
  const bible = extractBibleRef(state)
  return bible.characters.map(c => c.name)
}

/**
 * Get all known faction names from state
 */
export function getKnownFactionNames(state: WritersRoomState): string[] {
  const bible = extractBibleRef(state)
  return bible.factions.map(f => f.name)
}

// ============================================
// R3: RELATIONSHIP CONSISTENCY VALIDATION
// ============================================

export interface RelationshipSnapshot {
  sourceCharacterId: string
  targetCharacterId: string
  relationshipType: string
  trust: number
  conflict: number
  tension: number
}

/**
 * Check relationship consistency for a beat.
 * Flags contradictory relationship changes based on established dynamics.
 */
export function checkRelationshipConsistency(
  beat: {
    logline: string
    content?: string
    charactersInvolved?: string[]
  },
  relationships: RelationshipSnapshot[],
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []
  const text = `${beat.logline} ${beat.content || ''}`.toLowerCase()
  const involved = beat.charactersInvolved || []

  for (const rel of relationships) {
    const sourceInvolved = involved.some(c => c.toLowerCase().includes(rel.sourceCharacterId.toLowerCase()))
    const targetInvolved = involved.some(c => c.toLowerCase().includes(rel.targetCharacterId.toLowerCase()))

    if (!sourceInvolved || !targetInvolved) continue

    // Check: Enemies suddenly cooperating without explanation
    if (rel.conflict > 70 && rel.trust < 30) {
      const cooperationWords = /\b(ally|allies|cooperat|team up|work together|join forces|trust)\b/i
      if (cooperationWords.test(text)) {
        const hasJustification = /\b(despite|reluctant|grudging|forced|no choice|survival|common enemy)\b/i.test(text)
        if (!hasJustification) {
          issues.push({
            code: 'RELATIONSHIP_CONTRADICTION',
            message: `${rel.sourceCharacterId} and ${rel.targetCharacterId} are enemies (conflict: ${rel.conflict}, trust: ${rel.trust}) but scene shows cooperation without explanation`,
            severity: 'warning',
            field: 'relationships',
            suggestion: 'Add context for why enemies are cooperating (mutual threat, forced alliance, etc.)',
          })
        }
      }
    }

    // Check: Characters who distrust each other sharing secrets
    if (rel.trust < 25) {
      const trustActions = /\b(confide|share secret|reveal|open up|vulnerable|honest)\b/i
      if (trustActions.test(text)) {
        issues.push({
          code: 'TRUST_VIOLATION',
          message: `${rel.sourceCharacterId} and ${rel.targetCharacterId} have very low trust (${rel.trust}) but scene shows trust-dependent behavior`,
          severity: 'warning',
          field: 'relationships',
          suggestion: 'Characters with low trust should not freely share secrets without setup',
        })
      }
    }
  }

  return issues
}
