/**
 * Series Bible Manager
 *
 * Manages immutable truths, character arcs, and thematic throughlines
 * for consistent storytelling across episodes.
 */

import {
  SeriesBibleArcField,
  SeriesBibleLinkStripReplacement,
  SeriesBiblePromptCopy,
  SeriesBiblePromptSection,
  SERIES_BIBLE_DEFAULT_TITLE,
  SERIES_BIBLE_LIST_SEPARATOR,
  SERIES_BIBLE_MOTIF_SEPARATOR,
  SERIES_BIBLE_RULE_LABEL,
  SERIES_BIBLE_SETTING_SEPARATOR,
} from '@/domains/storyteller/services/constants/series-bible-prompt'

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
  factions?: Record<string, unknown>[]
  updatedFields?: Record<string, unknown>
}

type BibleCast = Array<{ name: string; role?: string; description?: string }>

// Relaxed check: a bible counts as "started" if it has ANY meaningful content.
function hasBibleContent(bible: SeriesBible): boolean {
  return Boolean(
    bible.title ||
      bible.logline ||
      bible.worldDescription ||
      (bible.setting &&
        (bible.setting.place || bible.setting.time || bible.setting.socialContext)) ||
      (bible.worldRules && bible.worldRules.length > 0) ||
      (bible.thematicElements && bible.thematicElements.length > 0) ||
      (bible.genre && bible.genre.length > 0)
  )
}

function thematicElementsBlock(elements: ThematicElement[]): string {
  if (!(elements?.length > 0)) return ''
  let out: string = SeriesBiblePromptSection.ThematicElements
  elements.forEach(t => {
    if (typeof t === 'string') {
      out += `- ${t}\n`
    } else if (t && (t.theme || t.question)) {
      out += `- ${t.theme || SeriesBiblePromptCopy.Theme}${t.question ? `: "${t.question}"` : ''}\n`
    }
  })
  return out
}

function worldRulesBlock(rules: WorldRule[]): string {
  if (!(rules?.length > 0)) return ''
  let out: string = SeriesBiblePromptSection.WorldRules
  rules.forEach(r => {
    if (typeof r === 'string') {
      out += `- ${r}\n`
    } else if (r && (r.name || r.rule || r.description)) {
      const ruleName = r.name || r.rule || SERIES_BIBLE_RULE_LABEL
      const ruleDesc = r.description || r.consequence || ''
      out += `${ruleName}${ruleDesc ? `: ${ruleDesc}` : ''}\n`
    }
  })
  return out
}

function inspirationsBlock(inspirations: SeriesBible['inspirations']): string {
  if (
    !inspirations ||
    !(
      inspirations.books?.length > 0 ||
      inspirations.movies?.length > 0 ||
      inspirations.games?.length > 0
    )
  ) {
    return ''
  }
  let out: string = SeriesBiblePromptSection.Inspirations
  if (inspirations.books?.length > 0)
    out += `${SeriesBiblePromptSection.Books}${inspirations.books.join(SERIES_BIBLE_LIST_SEPARATOR)}\n`
  if (inspirations.movies?.length > 0)
    out += `${SeriesBiblePromptSection.Movies}${inspirations.movies.join(SERIES_BIBLE_LIST_SEPARATOR)}\n`
  if (inspirations.games?.length > 0)
    out += `${SeriesBiblePromptSection.Games}${inspirations.games.join(SERIES_BIBLE_LIST_SEPARATOR)}\n`
  return out
}

function characterArcsBlock(arcs: CharacterArc[]): string {
  if (!(arcs?.length > 0)) return ''
  let out: string = SeriesBiblePromptSection.CharacterArcs
  arcs.forEach(arc => {
    if (!arc || !arc.name) return
    const start = arc.startState || {}
    const end = arc.endState || {}
    out += `
${arc.name}:
${SeriesBibleArcField.StartBelief}${start.belief || SeriesBiblePromptCopy.Unknown}${SeriesBibleArcField.StartWant}${start.want || SeriesBiblePromptCopy.Unknown}${SeriesBibleArcField.StartNeed}${start.need || SeriesBiblePromptCopy.Unknown}"
${SeriesBibleArcField.Flaw}${start.flaw || SeriesBiblePromptCopy.NotDefined}
${SeriesBibleArcField.Lie}${start.lie || SeriesBiblePromptCopy.Unknown}"
${SeriesBibleArcField.EndTruth}${end.truth || SeriesBiblePromptCopy.Unknown}${SeriesBibleArcField.EndTransform}${end.transformation || SeriesBiblePromptCopy.Transform}
`
  })
  return out
}

function castBlock(cast?: BibleCast): string {
  if (!cast || cast.length === 0) return ''
  let out: string = SeriesBiblePromptSection.Cast
  cast.forEach(c => {
    out += `- ${c.name} (${c.role || SeriesBiblePromptCopy.UnknownRole}): ${c.description || SeriesBiblePromptCopy.NoDescription}\n`
  })
  return out
}

function bibleHeaderBlock(bible: SeriesBible): string {
  const genre =
    Array.isArray(bible.genre) && bible.genre.length > 0
      ? bible.genre.join(SERIES_BIBLE_LIST_SEPARATOR)
      : SeriesBiblePromptCopy.NotDefined
  const tone =
    Array.isArray(bible.tone) && bible.tone.length > 0
      ? bible.tone.join(SERIES_BIBLE_LIST_SEPARATOR)
      : SeriesBiblePromptCopy.NotDefined
  return `${SeriesBiblePromptSection.Header}${bible.title || SERIES_BIBLE_DEFAULT_TITLE}${SeriesBiblePromptSection.HeaderClose}${bible.logline || SeriesBiblePromptCopy.NotDefined}${SeriesBiblePromptSection.Logline}${bible.premise || SeriesBiblePromptCopy.NotDefined}${SeriesBiblePromptSection.Genre}${genre}${SeriesBiblePromptSection.Tone}${tone}${SeriesBiblePromptSection.ThematicCore}${bible.centralTheme || SeriesBiblePromptCopy.NotDefined}${SeriesBiblePromptSection.CentralQuestion}${bible.thematicQuestion || SeriesBiblePromptCopy.NotDefined}`
}

function settingBlock(bible: SeriesBible): string {
  return `${SeriesBiblePromptSection.Setting}${bible.setting?.time || SeriesBiblePromptCopy.NotDefined}${SeriesBiblePromptSection.Place}${bible.setting?.place || SeriesBiblePromptCopy.NotDefined}${SeriesBiblePromptSection.SocialContext}${bible.setting?.socialContext || SeriesBiblePromptCopy.NotDefined}`
}

// Convert bible to prompt context
export function bibleToPrompt(bible: SeriesBible, cast?: BibleCast): string {
  if (!hasBibleContent(bible)) {
    return SeriesBiblePromptCopy.NoBibleYet
  }

  let prompt = bibleHeaderBlock(bible)
  prompt += thematicElementsBlock(bible.thematicElements)
  prompt += settingBlock(bible)
  prompt += worldRulesBlock(bible.worldRules)

  if (bible.worldDescription) {
    prompt += `${SeriesBiblePromptSection.WorldDescription}${bible.worldDescription}\n`
  }

  prompt += inspirationsBlock(bible.inspirations)

  if (bible.moodSoundtrack) {
    prompt += `${SeriesBiblePromptSection.Soundtrack}${bible.moodSoundtrack}\n`
  }

  prompt += characterArcsBlock(bible.characterArcs)

  if (bible.toneGuidelines) {
    prompt += `${SeriesBiblePromptSection.ToneGuidelines}${bible.toneGuidelines.violence || SeriesBiblePromptCopy.NotSpecified}${SeriesBiblePromptSection.Humor}${bible.toneGuidelines.humor || SeriesBiblePromptCopy.NotSpecified}${SeriesBiblePromptSection.Dialogue}${bible.toneGuidelines.dialogue || SeriesBiblePromptCopy.NotSpecified}
`
  }

  if (bible.visualMotifs?.length > 0) {
    prompt += `${SeriesBiblePromptSection.VisualMotifs}${bible.visualMotifs.join(SERIES_BIBLE_LIST_SEPARATOR)}\n`
  }

  if (bible.cinematicInfluences?.length > 0) {
    prompt += `${SeriesBiblePromptSection.CinematicInfluences}${bible.cinematicInfluences.join(SERIES_BIBLE_LIST_SEPARATOR)}\n`
  }

  prompt += castBlock(cast)

  prompt += SeriesBiblePromptCopy.EndMarker

  return prompt
}

/** Returns a prompt focused on isometric/2D game tiles that match the Storyteller theme. */
export function bibleToVisualPrompt(bible: SeriesBible, _cast?: Array<{ name: string; role?: string; description?: string }>): string {
  const stripLinks = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\[[^\]]+\]/g, SeriesBibleLinkStripReplacement.BracketRef)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, SeriesBibleLinkStripReplacement.MarkdownLink)
  }

  const gameTileFrame = (theme: string) =>
    `${SeriesBiblePromptCopy.GameTilePrefix}${theme}${SeriesBiblePromptCopy.GameTileSuffix}`

  // Priority 1: Use worldDescription (first sentence), reframed for game tiles
  if (bible.worldDescription) {
    const cleanedDesc = stripLinks(bible.worldDescription)
    const sentences = cleanedDesc.split(/(?<=[.!?])\s+/).filter(s => s.trim())
    const first = sentences.slice(0, 1).join(' ').replace(/\.$/, '')
    if (first) {
      const motifHint =
        bible.visualMotifs?.length > 0
          ? SERIES_BIBLE_MOTIF_SEPARATOR + bible.visualMotifs.slice(0, 2).join(SERIES_BIBLE_MOTIF_SEPARATOR)
          : ''
      return gameTileFrame(first + motifHint)
    }
  }

  // Fallback: Build from setting info, game-tile framed
  const parts: string[] = []
  if (bible.setting?.place) parts.push(stripLinks(bible.setting.place))
  if (bible.setting?.time) parts.push(stripLinks(bible.setting.time))
  if (bible.setting?.socialContext) parts.push(stripLinks(bible.setting.socialContext))
  const settingPrompt = parts.join(SERIES_BIBLE_SETTING_SEPARATOR).trim()
  if (settingPrompt) return gameTileFrame(settingPrompt)

  if (bible.title) return gameTileFrame(stripLinks(bible.title))

  return gameTileFrame(SeriesBiblePromptCopy.FantasyLandscapeFallback)
}
