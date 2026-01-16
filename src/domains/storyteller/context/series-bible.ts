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
}

// Default empty bible
export function createEmptyBible(): SeriesBible {
  return {
    title: '',
    logline: '',
    premise: '',
    genre: [],
    tone: [],
    centralTheme: '',
    thematicQuestion: '',
    thematicElements: [],
    setting: { time: '', place: '', socialContext: '' },
    worldRules: [],
    characterArcs: [],
    toneGuidelines: { violence: '', humor: '', romance: '', dialogue: '' },
    visualMotifs: [],
    colorPalette: [],
    cinematicInfluences: [],
    worldDescription: '',
    inspirations: { books: [], movies: [], games: [] },
    moodSoundtrack: '',
    moodImages: [],
  }
}

// Convert bible to prompt context
export function bibleToPrompt(bible: SeriesBible): string {
  if (!bible.title && !bible.logline) {
    return 'No series bible has been established yet. Work with the user to define the world.'
  }

  let prompt = `
=== SERIES BIBLE: ${bible.title || 'Untitled'} ===

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

  prompt += '\n=== END SERIES BIBLE ==='

  return prompt
}

// Extract character state for psychology agent
export function getCharacterContext(bible: SeriesBible, characterId: string): string {
  const arc = bible.characterArcs.find(a => a.characterId === characterId)
  if (!arc) return 'Character not found in series bible.'

  return `
CHARACTER PSYCHOLOGY: ${arc.name}

Current Belief: ${arc.startState.belief}
Central Flaw: ${arc.startState.flaw}
Surface Want: ${arc.startState.want}
True Need: ${arc.startState.need}
Self-Deception: "${arc.startState.lie}"

TRANSFORMATION VECTOR:
From: ${arc.startState.belief}
To: ${arc.endState.truth}
Through: ${arc.transformationTriggers.join(' → ')}

When evaluating this character's actions, ask:
1. Does this serve their stated WANT or hidden NEED?
2. Does this challenge or reinforce their FLAW?
3. Would they justify this action to themselves? How?
4. Is this a step toward or away from their transformation?
`
}

// Extract visual prompts for world generation
export function bibleToVisualPrompt(bible: SeriesBible): string {
  // Priority 1: Use worldDescription if available
  if (bible.worldDescription) {
    // Extract first 3 sentences or truncate appropriately
    const sentences = bible.worldDescription.split(/(?<=[.!?])\s+/).filter(s => s.trim())
    return sentences.slice(0, 3).join(' ')
  }

  // Fallback: Build from setting info
  const parts: string[] = []
  if (bible.setting?.place) parts.push(bible.setting.place)
  if (bible.setting?.time) parts.push(`Set in ${bible.setting.time}.`)
  if (bible.setting?.socialContext) parts.push(bible.setting.socialContext)

  return parts.join(' ') || ''
}
