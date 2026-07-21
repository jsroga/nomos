import type { beats } from '@/db'
import { EntityRefPrefix } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  StorytellerAnswerSeparator,
  StorytellerDefaultTitle,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { ContextAssemblyFallback } from '@/domains/storyteller/services/constants/context-assembly'
import { BibleCategoryKey } from '@/shared/data/constants/protocol'
import {
  namedRecordsFromJson,
  readString,
  recordArrayFromJson,
  recordFromJson,
} from '@/shared/data/json-guards'
import type { Character, ProjectMeta } from './context-assembly-parsers'

type BeatRow = typeof beats.$inferSelect

function slugId(prefix: string, id: string | undefined, name: string): string {
  const suffix = id?.slice(0, 8) ?? name.toLowerCase().replace(/\s+/g, '-')
  return `${prefix}-${suffix}`
}

interface ParsedWorldRule {
  id?: string
  category: string
  rule: string
  consequence: string
}

interface ParsedFaction {
  id?: string
  name: string
  ideology: string
  description: string
}

interface ParsedNamedEntity {
  id?: string
  name: string
  description: string
}

interface ParsedSequence {
  name: string
  description: string
}

function factionsFromUnknown(value: unknown): ParsedFaction[] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    ideology: readString(row.ideology) ?? '',
    description: readString(row.description) ?? '',
    goals: [],
    resources: '',
  }))
}

function namedEntitiesFromUnknown(value: unknown): ParsedNamedEntity[] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    description: readString(row.description) ?? '',
  }))
}

function worldRulesFromUnknown(value: unknown): ParsedWorldRule[] {
  return recordArrayFromJson(value).flatMap(row => {
    const rule = readString(row.rule)
    if (!rule) return []
    return [{
      id: readString(row.id),
      category: readString(row.category) ?? BibleCategoryKey.General,
      rule,
      consequence: readString(row.consequence) ?? '',
    }]
  })
}

function sequencesFromUnknown(value: unknown): ParsedSequence[] {
  return namedRecordsFromJson(value).map(row => ({
    name: row.name,
    description: readString(row.description) ?? '',
  }))
}

function inspirationsFromUnknown(value: unknown): {
  movies: string[]
  books: string[]
  games: string[]
} {
  const inspirations = recordFromJson(value)
  const titleFromItem = (item: unknown): string => {
    if (typeof item === 'string') return item
    return readString(recordFromJson(item).title) ?? ContextAssemblyFallback.NoneLabel
  }
  return {
    movies: recordArrayFromJson(inspirations.movies).map(titleFromItem),
    books: recordArrayFromJson(inspirations.books).map(titleFromItem),
    games: recordArrayFromJson(inspirations.games).map(titleFromItem),
  }
}

export function formatFactionsBlock(factions: unknown): string {
  const rows = factionsFromUnknown(factions)
  if (rows.length === 0) return ContextAssemblyFallback.None
  return rows
    .map(f => {
      const factionId = slugId(EntityRefPrefix.Faction, f.id, f.name)
      return `- [${f.name}][${factionId}]: ${f.ideology || f.description || ContextAssemblyFallback.NoDescription}`
    })
    .join('\n')
}

export function formatNamedRefBlock(rows: unknown, prefix: EntityRefPrefix): string {
  const parsedRows = namedEntitiesFromUnknown(rows)
  if (parsedRows.length === 0) return ContextAssemblyFallback.None
  return parsedRows
    .map(x => {
      const refId = slugId(prefix, x.id, x.name)
      return `- [${x.name}][${refId}]: ${x.description || ContextAssemblyFallback.NoDescription}`
    })
    .join('\n')
}

export function formatWorldRulesLinkedBlock(rules: unknown): string {
  const parsedRules = worldRulesFromUnknown(rules)
  if (parsedRules.length === 0) return ContextAssemblyFallback.None
  return parsedRules
    .map(r => {
      const ruleId = slugId(
        EntityRefPrefix.Rule,
        r.id,
        r.category || StoryEntityType.Rule,
      )
      return `- [${r.category || ContextAssemblyFallback.RuleLabel}][${ruleId}]: ${r.rule || ContextAssemblyFallback.NoDescription}`
    })
    .join('\n')
}

export function formatWorldRulesPlainBlock(rules: unknown): string {
  const parsedRules = worldRulesFromUnknown(rules)
  if (parsedRules.length === 0) return ContextAssemblyFallback.None
  return parsedRules
    .map(
      r =>
        `- [${r.category || BibleCategoryKey.General}] ${r.rule}${r.consequence ? ` → ${r.consequence}` : ''}`
    )
    .join('\n')
}

export function formatInspirationsBlock(inspirations: unknown): string {
  if (inspirations === null || inspirations === undefined) return ContextAssemblyFallback.None
  const parsed = inspirationsFromUnknown(inspirations)
  const sep = StorytellerAnswerSeparator.CommaSpace
  const movies = parsed.movies.join(sep) || ContextAssemblyFallback.NoneLabel
  const books = parsed.books.join(sep) || ContextAssemblyFallback.NoneLabel
  const games = parsed.games.join(sep) || ContextAssemblyFallback.NoneLabel
  return `Movies: ${movies} | Books: ${books} | Games: ${games}`
}

export function formatSequencesBlock(sequences: unknown): string {
  const parsedSequences = sequencesFromUnknown(sequences)
  if (parsedSequences.length === 0) return ContextAssemblyFallback.None
  return parsedSequences.map((s, i) => `${i + 1}. ${s.name}: ${s.description || ''}`).join('\n')
}

export function formatCharactersBlock(sortedChars: Character[]): string {
  if (sortedChars.length === 0) return ''
  const lines = sortedChars
    .slice(0, 20)
    .map(c => {
      const charId = slugId(EntityRefPrefix.Character, c.id, c.name)
      return `- [${c.name}][${charId}] (${c.role || '?'}): ${c.description || ContextAssemblyFallback.NoDescription}`
    })
    .join('\n')
  return `=== CHARACTERS (${sortedChars.length}) ===\n${lines}`
}

export function formatBeatsBlock(beats: BeatRow[]): string {
  if (beats.length === 0) return ''
  const lines = beats
    .slice(-3)
    .map(b => {
      const beatId = slugId(EntityRefPrefix.Beat, b.id, String(b.sequence ?? '0'))
      return `- [${b.logline || `Beat ${b.sequence}`}][${beatId}]`
    })
    .join('\n')
  return `=== RECENT BEATS (${beats.length}) ===\n${lines}`
}

export function buildSystemContextBlock(params: {
  projectId: string
  episodeId?: string
  phase: PhaseId
  masterPrompt: string
}): string {
  const linkReqs = getEntityLinkRequirements()
  const { projectId, episodeId, phase, masterPrompt } = params

  return `=== IQ 200 CONTEXT ENGINEERING & ENTITY LINKS ===
You are in a high-fidelity creative workspace. To maintain continuity and enable user interaction, you MUST use the following rules for entity references:
1. ENTITY LINKS: Whenever you mention a Character, Faction, World Rule, Episode, Item, or Event, ALWAYS use the format: [Entity Name][entity-id].
   Example: "[Marcus][char-123] challenged the [Council of Seven][faction-456] for the [One Ring][item-001]."
2. REQUIRED MINIMUMS (in the prose only): The worldDescription narrative text (the paragraphs) MUST contain at least ${linkReqs.minItems} ITEM, ${linkReqs.minEvents} EVENT, and ${linkReqs.minRules} RULE links woven into the prose. Separate "Items:" / "Events:" / "Rules:" lists do NOT count—only [Name][item-id] etc. inside the worldDescription string. Weave entities into sentences; if below minimum, the tool will REJECT.
3. CLICKABLE UI: These tags are rendered as clickable links and hover tooltips in the user's interface. Using them makes your intelligence visible and actionable.
4. CONTEXT SYNTHESIS: Use the technical data below to weave a "connected" world. Don't just list facts; synthesize them into a brilliant narrative.
5. IQ 200 REASONING: Your Council of Agents provides raw data; your job as Showrunner is to spot the "out of the box" connections they missed.

=== SYSTEM CONTEXT ===
projectId: ${projectId}
${episodeId ? `episodeId: ${episodeId}` : ''}
currentPhase: ${phase}
IMPORTANT: When calling tools that require projectId, you MUST use: "${projectId}"
${episodeId ? `When calling tools that require episodeId, you MUST use: "${episodeId}"` : ''}
CURRENT STORY PHASE: ${phase}
- ${Phase.PREMISE}: Concept planning, world building, episode premise.
- ${Phase.BREAKING}: Plot structure, beat board organization.
- ${Phase.WRITING}: Scripting and dialogue execution.
⚠️ REFERENCE ONLY: Content below is for world/history consistency. When asked to GENERATE, create NEW content.
${masterPrompt ? `\n=== MASTER PROMPT ===\n${masterPrompt}` : ''}
`
}

export function buildProjectContextBlock(params: {
  projectName: string | undefined
  meta: ProjectMeta
  storyPlan: Record<string, unknown>
  bible: Record<string, unknown>
}): string {
  const { projectName, meta, storyPlan, bible } = params
  const { genre, tone, theme, premise } = meta

  return `=== PROJECT ===
Title: ${projectName || StorytellerDefaultTitle.Untitled} | Genre: ${genre} | Tone: ${tone} | Theme: ${theme}

=== EPISODE PREMISE ===
${Object.keys(premise).length > 0 ? JSON.stringify(premise) : ContextAssemblyFallback.NoEpisodePremise}

=== WORLD ===
${readString(storyPlan.worldDescription) || readString(bible.worldDescription) || ContextAssemblyFallback.NoWorldDescription}

=== WORLD RULES ===
${formatWorldRulesPlainBlock(storyPlan.worldRules)}

=== FACTIONS ===
${formatFactionsBlock(storyPlan.factions)}

=== ITEMS ===
${formatNamedRefBlock(storyPlan.items, EntityRefPrefix.Item)}

=== EVENTS ===
${formatNamedRefBlock(storyPlan.events, EntityRefPrefix.Event)}

=== WORLD RULES (linked) ===
${formatWorldRulesLinkedBlock(storyPlan.worldRules)}

=== INSPIRATIONS ===
${formatInspirationsBlock(storyPlan.inspirations)}

=== SEQUENCES ===
${formatSequencesBlock(storyPlan.sequences)}`
}
