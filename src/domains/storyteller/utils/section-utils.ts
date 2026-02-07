import { BibleSection, SectionDetection } from '../prompts/section-prompts'
import {
  StoryPlan,
  WorldRule,
  Faction,
  KeyCharacter,
  StorySequence,
  SoundtrackTrack,
} from '../schemas/agent-schemas'

/**
 * No pattern matching - LLM decides which section to update via tool parameters.
 * This function is deprecated - section comes from tool call.
 */
export function detectTargetSection(_userMessage: string): SectionDetection {
  // Always return 'full' - let the LLM's tool call specify which section
  return { section: 'full', instruction: _userMessage }
}

/**
 * Reset section detection between calls
 */
export function resetSectionDetection() {
  lastDetectedSection = ''
}

/**
 * Build context string for a specific section based on existing bible data
 */
export function buildSectionContext(
  section: BibleSection,
  bible: Partial<StoryPlan>,
  storyPlan: Partial<StoryPlan>
): string {
  if (section === 'full') return ''

  const parts: string[] = [`## ${section.toUpperCase()} CONTEXT`]

  switch (section) {
    case 'worldDescription':
      const desc = storyPlan.worldDescription || bible.worldDescription
      if (desc) {
        parts.push('\n**Existing World Description:**')
        parts.push(desc)
      }
      break

    case 'worldRules':
      const rules = storyPlan.worldRules || bible.worldRules || []
      if (rules.length > 0) {
        parts.push('\n**Existing World Rules:**')
        rules.forEach((r: WorldRule, i: number) => {
          if (typeof r === 'string') {
            parts.push(`${i + 1}. ${r}`)
          } else {
            parts.push(`${i + 1}. [${r.category}] ${r.rule} → ${r.consequence}`)
          }
        })
      }
      break

    case 'factions':
      const factions = storyPlan.factions || bible.factions || []
      if (factions.length > 0) {
        parts.push('\n**Existing Factions:**')
        factions.forEach((f: Faction) => {
          const goals = Array.isArray(f.goals) ? f.goals.join(', ') : (f.goals || 'N/A')
          parts.push(`- ${f.name || 'Unknown'}: ${f.ideology || 'N/A'} (Goals: ${goals})`)
        })
      }
      break

    case 'inspirations':
      const ins = storyPlan.inspirations || bible.inspirations
      if (ins) {
        parts.push('\n**Existing Inspirations:**')
        if (ins.books?.length > 0)
          parts.push(
            `- Books: ${ins.books.map((b: any) => (typeof b === 'string' ? b : b.title || 'Untitled')).join(', ')}`
          )
        if (ins.movies?.length > 0)
          parts.push(
            `- Movies: ${ins.movies.map((m: any) => (typeof m === 'string' ? m : m.title || 'Untitled')).join(', ')}`
          )
        if (ins.games?.length > 0)
          parts.push(
            `- Games: ${ins.games.map((g: any) => (typeof g === 'string' ? g : g.title || 'Untitled')).join(', ')}`
          )
      }
      break

    case 'episodeRoadmap':
      const seqs = storyPlan.sequences || bible.sequences || []
      if (Array.isArray(seqs) && seqs.length > 0) {
        parts.push('\n**Existing Episode Roadmap:**')
        seqs.forEach((s: StorySequence) => {
          const id = s.id || '?'
          const name = s.name || 'Untitled'
          const desc = s.logline || s.description || 'No description'
          parts.push(`- Ep ${id}: ${name} - ${desc}`)
        })
      }
      break

    case 'keyCharacters':
      const chars = storyPlan.keyCharacters || bible.keyCharacters || []
      if (chars.length > 0) {
        parts.push('\n**Existing Key Characters:**')
        chars.forEach((c: KeyCharacter) => {
          const name = c.name || 'Unknown'
          const role = c.role || 'N/A'
          const archetype = c.archetype || 'N/A'
          const motivation = c.motivation || 'N/A'
          parts.push(`- ${name} (${role}): ${archetype} - ${motivation}`)
        })
      }
      break

    case 'soundtracks':
      const existingSoundtracks = storyPlan.soundtracks || []
      if (existingSoundtracks.length > 0) {
        parts.push('\n**⚠️ EXISTING SOUNDTRACKS (DO NOT SUGGEST THESE AGAIN):**')
        existingSoundtracks.forEach((s: SoundtrackTrack) =>
          parts.push(`- "${s.title}" by ${s.artist}`)
        )
        parts.push('\n**You MUST suggest DIFFERENT tracks from the ones listed above.**')
      }
      break
  }

  return parts.join('\n')
}
