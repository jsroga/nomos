/**
 * Series Bible Manager
 *
 * Manages immutable truths, character arcs, and thematic throughlines
 * for consistent storytelling across episodes.
 */

export interface CharacterArc {
  characterId: string
  name: string
  startState: {
    belief: string // What they believe at the start
    flaw: string // Their central flaw
    want: string // What they think they want
    need: string // What they actually need
    lie: string // The lie they tell themselves
  }
  endState: {
    belief: string // What they believe at the end
    transformation: string // How they've changed
    truth: string // The truth they've accepted (or rejected)
  }
  transformationTriggers: string[] // Key moments that push change
}

export interface WorldRule {
  name: string
  description: string
  constraints: string[] // What this rule prevents
  examples: string[] // How this manifests
  rule?: string // Legacy support
  consequence?: string // Legacy support
}

export interface ThematicElement {
  theme: string
  question: string // The central question this theme asks
  variations: string[] // Different ways this theme manifests
  symbols: string[] // Visual/object symbols for this theme
}

export interface SeriesBible {
  // Core Identity
  title: string
  logline: string // One sentence summary
  premise: string // The core "what if"
  genre: string[]
  tone: string[] // e.g., "dark", "sardonic", "hopeful"

  // Thematic Core
  centralTheme: string
  thematicQuestion: string // e.g., "Can a good man do terrible things?"
  thematicElements: ThematicElement[]

  // World Building
  setting: {
    time: string
    place: string
    socialContext: string
  }
  worldRules: WorldRule[]

  // Character Arcs
  characterArcs: CharacterArc[]

  // Tone Guidelines
  toneGuidelines: {
    violence: string // How we handle violence
    humor: string // Type of humor, if any
    romance: string // How we handle romance
    dialogue: string // Dialogue style
  }

  // Visual Language
  visualMotifs: string[]
  colorPalette: string[]
  cinematicInfluences: string[]

  // World Context
  worldDescription: string
  inspirations: {
    books: string[]
    movies: string[]
    games: string[]
  }
  moodSoundtrack: string
  moodImages: string[]

  // Flexible fields for merged data
  factions?: any[]
  updatedFields?: Record<string, any>
}

// Convert bible to prompt context
export function bibleToPrompt(bible: SeriesBible, cast?: Array<{ name: string; role?: string; description?: string }>): string {
  // Relaxed check: consider a bible "started" if it has ANY meaningful content
  const hasContent =
    bible.title ||
    bible.logline ||
    bible.worldDescription ||
    (bible.setting && (bible.setting.place || bible.setting.time || bible.setting.socialContext)) ||
    (bible.worldRules && bible.worldRules.length > 0) ||
    (bible.thematicElements && bible.thematicElements.length > 0) ||
    (bible.genre && bible.genre.length > 0)

  if (!hasContent) {
    return 'No series bible has been established yet. Describe your world concept to begin generating.'
  }

  let prompt = `
=== STORY BIBLE: ${bible.title || 'Untitled'} ===

LOGLINE: ${bible.logline || 'Not defined'}

PREMISE: ${bible.premise || 'Not defined'}

GENRE: ${Array.isArray(bible.genre) && bible.genre.length > 0 ? bible.genre.join(', ') : 'Not defined'}
TONE: ${Array.isArray(bible.tone) && bible.tone.length > 0 ? bible.tone.join(', ') : 'Not defined'}

--- THEMATIC CORE ---
Central Theme: ${bible.centralTheme || 'Not defined'}
Central Question: ${bible.thematicQuestion || 'Not defined'}
`

  if (bible.thematicElements?.length > 0) {
    prompt += '\nThematic Elements:\n'
    bible.thematicElements.forEach(t => {
      if (typeof t === 'string') {
        prompt += `- ${t}\n`
      } else if (t && (t.theme || t.question)) {
        prompt += `- ${t.theme || 'Theme'}${t.question ? `: "${t.question}"` : ''}\n`
      }
    })
  }

  prompt += `
--- SETTING ---
Time: ${bible.setting?.time || 'Not defined'}
Place: ${bible.setting?.place || 'Not defined'}
Social Context: ${bible.setting?.socialContext || 'Not defined'}
`

  if (bible.worldRules?.length > 0) {
    prompt += '\n--- WORLD RULES ---\n'
    bible.worldRules.forEach(r => {
      // Handle different possible structures for world rules
      if (typeof r === 'string') {
        prompt += `- ${r}\n`
      } else if (r && (r.name || r.rule || r.description)) {
        const ruleName = r.name || r.rule || 'Rule'
        const ruleDesc = r.description || r.consequence || ''
        prompt += `${ruleName}${ruleDesc ? `: ${ruleDesc}` : ''}\n`
      }
    })
  }

  if (bible.worldDescription) {
    prompt += `\n--- WORLD DESCRIPTION ---\n${bible.worldDescription}\n`
  }

  if (
    bible.inspirations &&
    (bible.inspirations.books?.length > 0 ||
      bible.inspirations.movies?.length > 0 ||
      bible.inspirations.games?.length > 0)
  ) {
    prompt += '\n--- INSPIRATIONS ---\n'
    if (bible.inspirations.books?.length > 0)
      prompt += `Books: ${bible.inspirations.books.join(', ')}\n`
    if (bible.inspirations.movies?.length > 0)
      prompt += `Movies: ${bible.inspirations.movies.join(', ')}\n`
    if (bible.inspirations.games?.length > 0)
      prompt += `Games: ${bible.inspirations.games.join(', ')}\n`
  }

  if (bible.moodSoundtrack) {
    prompt += `\nSoundtrack / Mood: ${bible.moodSoundtrack}\n`
  }

  if (bible.characterArcs?.length > 0) {
    prompt += '\n--- CHARACTER ARCS ---\n'
    bible.characterArcs.forEach(arc => {
      if (!arc || !arc.name) return
      const start = arc.startState || {}
      const end = arc.endState || {}
      prompt += `
${arc.name}:
  START: Believes "${start.belief || 'unknown'}", wants "${start.want || 'unknown'}", needs "${start.need || 'unknown'}"
  FLAW: ${start.flaw || 'Not defined'}
  LIE: "${start.lie || 'unknown'}"
  END: Must realize "${end.truth || 'unknown'}" and ${end.transformation || 'transform'}
`
    })
  }

  if (bible.toneGuidelines) {
    prompt += `
--- TONE GUIDELINES ---
Violence: ${bible.toneGuidelines.violence || 'Not specified'}
Humor: ${bible.toneGuidelines.humor || 'Not specified'}
Dialogue: ${bible.toneGuidelines.dialogue || 'Not specified'}
`
  }

  if (bible.visualMotifs?.length > 0) {
    prompt += `\nVisual Motifs: ${bible.visualMotifs.join(', ')}\n`
  }

  if (bible.cinematicInfluences?.length > 0) {
    prompt += `Cinematic Influences: ${bible.cinematicInfluences.join(', ')}\n`
  }

  // Project-level cast (characters)
  if (cast && cast.length > 0) {
    prompt += '\n--- CAST ---\n'
    cast.forEach(c => {
      prompt += `- ${c.name} (${c.role || 'Unknown role'}): ${c.description || 'No description'}\n`
    })
  }

  prompt += '\n=== END SERIES BIBLE ==='

  return prompt
}

/** Returns a prompt focused on isometric/2D game tiles that match the Storyteller theme. */
export function bibleToVisualPrompt(bible: SeriesBible, _cast?: Array<{ name: string; role?: string; description?: string }>): string {
  const stripLinks = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  }

  const gameTileFrame = (theme: string) =>
    `Isometric game tile: ${theme}. Tileable 2D game environment.`

  // Priority 1: Use worldDescription (first sentence), reframed for game tiles
  if (bible.worldDescription) {
    const cleanedDesc = stripLinks(bible.worldDescription)
    const sentences = cleanedDesc.split(/(?<=[.!?])\s+/).filter(s => s.trim())
    const first = sentences.slice(0, 1).join(' ').replace(/\.$/, '')
    if (first) {
      const motifHint =
        bible.visualMotifs?.length > 0
          ? ', ' + bible.visualMotifs.slice(0, 2).join(', ')
          : ''
      return gameTileFrame(first + motifHint)
    }
  }

  // Fallback: Build from setting info, game-tile framed
  const parts: string[] = []
  if (bible.setting?.place) parts.push(stripLinks(bible.setting.place))
  if (bible.setting?.time) parts.push(stripLinks(bible.setting.time))
  if (bible.setting?.socialContext) parts.push(stripLinks(bible.setting.socialContext))
  const settingPrompt = parts.join('. ').trim()
  if (settingPrompt) return gameTileFrame(settingPrompt)

  // Title fallback
  if (bible.title) return gameTileFrame(stripLinks(bible.title))

  return gameTileFrame('detailed fantasy world landscape with unique terrain')
}
