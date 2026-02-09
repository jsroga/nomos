/**
 * Output Capture for Hypothesis Experiments
 *
 * Extracts story data from tool calls and simulation results:
 * - World Bible from update_world_bible tool calls
 * - Episodes from database
 * - Beats from manage_beat tool calls and database
 * - Script content from episodes
 * - Characters from database
 */

import {
  CapturedOutputs,
  CapturedWorldBible,
  CapturedBeat,
  CapturedCharacter,
  CapturedToolCall,
  OutputScope,
} from './types'

// ============================================
// Tool Call Processing
// ============================================

/**
 * Extract world bible updates from tool calls
 */
export function extractWorldBibleFromToolCalls(toolCalls: CapturedToolCall[]): CapturedWorldBible {
  const worldBible: CapturedWorldBible = {}

  // Find all update_world_bible tool calls
  const worldBibleCalls = toolCalls.filter(tc => tc.name === 'update_world_bible')

  for (const call of worldBibleCalls) {
    const args = call.args as Record<string, unknown>

    // Merge each field
    if (args.masterPrompt) {
      worldBible.masterPrompt = args.masterPrompt as string
    }
    if (args.worldRules && Array.isArray(args.worldRules)) {
      worldBible.worldRules = args.worldRules as CapturedWorldBible['worldRules']
    }
    if (args.factions && Array.isArray(args.factions)) {
      worldBible.factions = args.factions as CapturedWorldBible['factions']
    }
    if (args.inspirations) {
      worldBible.inspirations = args.inspirations as CapturedWorldBible['inspirations']
    }
    if (args.soundtracks && Array.isArray(args.soundtracks)) {
      worldBible.soundtracks = args.soundtracks as CapturedWorldBible['soundtracks']
    }
    if (args.episodePremise) {
      worldBible.episodePremise = {
        ...worldBible.episodePremise,
        ...(args.episodePremise as CapturedWorldBible['episodePremise']),
      }
    }
    if (args.cast && Array.isArray(args.cast)) {
      worldBible.cast = args.cast as CapturedWorldBible['cast']
    }
    if (args.worldDescription) {
      worldBible.worldDescription = args.worldDescription as string
    }
    if (args.plotTwists && Array.isArray(args.plotTwists)) {
      worldBible.plotTwists = args.plotTwists as CapturedWorldBible['plotTwists']
    }
  }

  return worldBible
}

/**
 * Extract beats from tool calls
 */
export function extractBeatsFromToolCalls(toolCalls: CapturedToolCall[]): CapturedBeat[] {
  const beats: CapturedBeat[] = []
  const beatMap = new Map<string, CapturedBeat>()

  // Find all manage_beat tool calls
  const beatCalls = toolCalls.filter(tc => tc.name === 'manage_beat')

  for (const call of beatCalls) {
    const args = call.args as Record<string, unknown>
    const action = args.action as string

    if (action === 'create' || action === 'update') {
      const beatData: CapturedBeat = {
        id:
          (args.beatId as string) || `beat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: (args.sequence as number) || 0,
        logline: (args.logline as string) || '',
        beatType: (args.beatType as CapturedBeat['beatType']) || 'setup',
        content: args.content as string | undefined,
        visualHook: args.visualHook as string | undefined,
        charactersInvolved: args.charactersInvolved as string[] | undefined,
        emotionalShifts: args.emotionalShifts as
          | Record<string, { from: string; to: string }>
          | undefined,
        causalDependencies: args.causalDependencies as string[] | undefined,
        status: 'proposed',
      }

      beatMap.set(beatData.id, beatData)
    }
  }

  // Convert map to array sorted by sequence
  return Array.from(beatMap.values()).sort((a, b) => a.sequence - b.sequence)
}

/**
 * Extract characters from create_character tool calls
 */
export function extractCharactersFromToolCalls(toolCalls: CapturedToolCall[]): CapturedCharacter[] {
  const characters: CapturedCharacter[] = []
  const characterMap = new Map<string, CapturedCharacter>()

  // Find all create_character tool calls
  const charCalls = toolCalls.filter(tc => tc.name === 'create_character')

  for (const call of charCalls) {
    const args = call.args as Record<string, unknown>
    const result = call.result as Record<string, unknown> | undefined

    const charData: CapturedCharacter = {
      id: (result?.id as string) || `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: (args.name as string) || 'Unknown',
      role: (args.role as string) || 'Supporting',
      description: args.description as string | undefined,
      psychology: args.psychology as CapturedCharacter['psychology'] | undefined,
    }

    characterMap.set(charData.id, charData)
  }

  return Array.from(characterMap.values())
}

// ============================================
// Full Output Capture
// ============================================

/**
 * Capture all outputs from tool calls based on scope
 */
export function captureOutputsFromToolCalls(
  toolCalls: CapturedToolCall[],
  scope: OutputScope[]
): CapturedOutputs {
  const outputs: CapturedOutputs = {}

  if (scope.includes('worldBible')) {
    outputs.worldBible = extractWorldBibleFromToolCalls(toolCalls)
  }

  if (scope.includes('beats')) {
    outputs.beats = extractBeatsFromToolCalls(toolCalls)
  }

  // Characters are always extracted if worldBible or beats are requested
  if (scope.includes('worldBible') || scope.includes('beats')) {
    outputs.characters = extractCharactersFromToolCalls(toolCalls)
  }

  return outputs
}

// ============================================
// Output Serialization
// ============================================

/**
 * Convert captured outputs to evaluation-ready text
 */
export function serializeOutputsForEvaluation(
  outputs: CapturedOutputs,
  scope: OutputScope[]
): string {
  const sections: string[] = []

  // World Bible
  if (scope.includes('worldBible') && outputs.worldBible) {
    const wb = outputs.worldBible
    const wbSections: string[] = []

    if (wb.masterPrompt) {
      wbSections.push(`## Master Prompt\n${wb.masterPrompt}`)
    }

    if (wb.worldDescription) {
      wbSections.push(`## World Description\n${wb.worldDescription}`)
    }

    if (wb.worldRules?.length) {
      wbSections.push(
        `## World Rules\n${wb.worldRules
          .map(r => `- **${r.category}**: ${r.rule} → ${r.consequence}`)
          .join('\n')}`
      )
    }

    if (wb.cast?.length) {
      wbSections.push(
        `## Cast\n${wb.cast
          .map(
            c =>
              `### ${c.name} (${c.role})\n${c.description || ''}\n- Motivation: ${c.motivation || 'Unknown'}\n- Archetype: ${c.archetype || 'Unknown'}`
          )
          .join('\n\n')}`
      )
    }

    if (wb.factions?.length) {
      wbSections.push(
        `## Factions\n${wb.factions
          .map(
            f =>
              `### ${f.name}\n${f.description || ''}\n- Ideology: ${f.ideology || 'Unknown'}\n- Goals: ${f.goals?.join(', ') || 'Unknown'}`
          )
          .join('\n\n')}`
      )
    }

    if (wb.episodePremise) {
      const ep = wb.episodePremise
      wbSections.push(
        `## Episode Premise\n- Logline: ${ep.logline || 'N/A'}\n- Protagonist Hook: ${ep.protagonistHook || 'N/A'}\n- Fatal Flaw: ${ep.fatalFlaw || 'N/A'}\n- Stakes: ${ep.stakes || 'N/A'}`
      )
    }

    if (wb.plotTwists?.length) {
      wbSections.push(
        `## Plot Twists\n${wb.plotTwists
          .map(pt => `### ${pt.title}\n${pt.description}\n- Impact: ${pt.impact || 'N/A'}`)
          .join('\n\n')}`
      )
    }

    if (wbSections.length) {
      sections.push(`# WORLD BIBLE\n\n${wbSections.join('\n\n')}`)
    }
  }

  // Episodes
  if (scope.includes('episodes') && outputs.episodes?.length) {
    const episodeSections = outputs.episodes.map(
      ep =>
        `## Episode ${ep.id}\n**Title**: ${ep.title || 'Untitled'}\n**Premise**: ${ep.premise || 'N/A'}\n**Phase**: ${ep.currentPhase || 'N/A'}\n**Status**: ${ep.status || 'N/A'}`
    )
    sections.push(`# EPISODES\n\n${episodeSections.join('\n\n')}`)
  }

  // Beats
  if (scope.includes('beats') && outputs.beats?.length) {
    const beatSections = outputs.beats.map(
      beat =>
        `## Beat ${beat.sequence}: ${beat.logline}\n**Type**: ${beat.beatType}\n**Visual Hook**: ${beat.visualHook || 'N/A'}\n**Characters**: ${beat.charactersInvolved?.join(', ') || 'N/A'}\n${beat.content ? `\n${beat.content}` : ''}`
    )
    sections.push(`# BEATS\n\n${beatSections.join('\n\n')}`)
  }

  // Script
  if (scope.includes('script') && outputs.script) {
    sections.push(`# SCRIPT\n\n${outputs.script}`)
  }

  // Characters
  if (outputs.characters?.length) {
    const charSections = outputs.characters.map(
      char => `## ${char.name} (${char.role})\n${char.description || 'No description'}`
    )
    sections.push(`# CHARACTERS\n\n${charSections.join('\n\n')}`)
  }

  return sections.join('\n\n---\n\n')
}

/**
 * Build context array for evaluation from captured outputs
 */
export function buildContextFromOutputs(outputs: CapturedOutputs): string[] {
  const context: string[] = []

  // Add character context
  if (outputs.characters?.length) {
    for (const char of outputs.characters) {
      context.push(
        `Character: ${char.name} - ${char.role}${char.description ? ` - ${char.description}` : ''}`
      )
    }
  }

  // Add world bible context
  if (outputs.worldBible) {
    const wb = outputs.worldBible

    if (wb.worldDescription) {
      context.push(`Setting: ${wb.worldDescription.slice(0, 200)}`)
    }

    if (wb.worldRules?.length) {
      for (const rule of wb.worldRules.slice(0, 3)) {
        context.push(`World Rule (${rule.category}): ${rule.rule}`)
      }
    }

    if (wb.episodePremise?.logline) {
      context.push(`Episode Logline: ${wb.episodePremise.logline}`)
    }
  }

  // Add beat context
  if (outputs.beats?.length) {
    const beatSummary = outputs.beats
      .slice(0, 5)
      .map(b => `Beat ${b.sequence}: ${b.logline}`)
      .join('; ')
    context.push(`Story Beats: ${beatSummary}`)
  }

  return context
}
