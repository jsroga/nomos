/**
 * Storyteller context assembly.
 *
 * Fetches project/bible/story-plan/characters/beats + RAG, formats them into
 * the agent system context, and enforces the token budget. Extracted from the
 * chat stream route to keep that handler focused on orchestration.
 */

import { eq } from 'drizzle-orm'
import { projects, storyPlans } from '@/db'
import type { beats, characters } from '@/db'
import { db } from '@/db/client'
import { budgetContext, type RawContextParts } from '@/domains/storyteller/services/context/token-budget'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { EntityRefPrefix } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  StorytellerAnswerSeparator,
  StorytellerDefaultTitle,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { Phase, parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/Enums'
import {
  BIBLE_CATEGORY_KEYS,
  ContextAssemblyFallback,
  ContextAssemblyLog,
} from '@/domains/storyteller/services/constants/context-assembly'
import { BibleCategoryKey } from '@/shared/data/constants/protocol'
import { ChatSenderAlias } from '@/shared/chat/core/constants/chat-messages'
import {
  namedRecordsFromJson,
  recordArrayFromJson,
  recordFromJson,
  readString,
} from '@/shared/data/json-guards'

type CharacterRow = typeof characters.$inferSelect
type BeatRow = typeof beats.$inferSelect

export interface Character {
  id: string
  name: string
  role?: string
  description?: string
  psychology?: Record<string, unknown>
}

interface WorldRuleRow {
  id?: string
  name?: string
  category?: string
  rule: string
  consequence?: string
}

interface NamedEntityRow {
  id?: string
  name: string
  description?: string
}

export interface StoryPlan {
  cast?: Character[]
  keyCharacters?: Character[]
  premise?: Record<string, unknown>
  episodePremise?: Record<string, unknown>
  worldDescription?: string
  genre?: string | string[]
  tone?: string | string[]
  centralTheme?: string
  worldRules?: WorldRuleRow[]
  factions?: Array<{ id?: string; name: string; ideology?: string; description?: string }>
  items?: NamedEntityRow[]
  events?: NamedEntityRow[]
  inspirations?: {
    movies?: Array<string | { title: string }>
    books?: Array<string | { title: string }>
    games?: Array<string | { title: string }>
  }
  sequences?: Array<{ name: string; description?: string }>
  masterPrompt?: string
}

export interface AssembleContextParams {
  projectId?: string
  episodeId?: string
  message: string
  currentPhase?: PhaseId
  userId: string
  /** Optional hook so callers can record context-load failures (e.g. Langfuse). */
  onError?: (err: unknown) => void
}

export interface AssembledContext {
  /** Formatted, token-budgeted context prompt ('' when no project or on failure). */
  contextPrompt: string
  /** Existing seriesBible snapshot, used for diff "before" state. */
  existingBibleData: Record<string, unknown>
}

const BIBLE_CATEGORY_SET = new Set<string>(BIBLE_CATEGORY_KEYS)

const ROLE_PRIORITY: Record<string, number> = {
  protagonist: 1,
  hero: 1,
  main: 1,
  antagonist: 2,
  villain: 2,
  mentor: 3,
  guide: 3,
  supporting: 4,
  side: 5,
}

function characterFromDbRow(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description ?? undefined,
  }
}

function characterFromPlanRow(row: Record<string, unknown>): Character | null {
  const name = readString(row.name)
  if (!name) return null
  return {
    id: readString(row.id) ?? '',
    name,
    role: readString(row.role),
    description: readString(row.description),
    psychology: recordFromJson(row.psychology),
  }
}

function charactersFromJson(value: unknown): Character[] {
  return recordArrayFromJson(value).flatMap(row => {
    const character = characterFromPlanRow(row)
    return character ? [character] : []
  })
}

function worldRulesFromJson(value: unknown): WorldRuleRow[] {
  return recordArrayFromJson(value).flatMap(row => {
    const rule = readString(row.rule)
    if (!rule) return []
    return [{
      id: readString(row.id),
      name: readString(row.name),
      category: readString(row.category),
      rule,
      consequence: readString(row.consequence),
    }]
  })
}

function factionsFromJson(value: unknown): StoryPlan['factions'] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    ideology: readString(row.ideology),
    description: readString(row.description),
  }))
}

function namedEntitiesFromJson(value: unknown): NamedEntityRow[] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    description: readString(row.description),
  }))
}

function inspirationTitle(item: unknown): string {
  if (typeof item === 'string') return item
  return readString(recordFromJson(item).title) ?? ContextAssemblyFallback.NoneLabel
}

function storyPlanFromJson(content: unknown): StoryPlan {
  const r = recordFromJson(content)
  const cast = charactersFromJson(r.cast)
  const keyCharacters = charactersFromJson(r.keyCharacters)

  return {
    cast: cast.length > 0 ? cast : undefined,
    keyCharacters: keyCharacters.length > 0 ? keyCharacters : undefined,
    premise: recordFromJson(r.premise),
    episodePremise: recordFromJson(r.episodePremise),
    worldDescription: readString(r.worldDescription),
    genre: Array.isArray(r.genre)
      ? r.genre.filter((g): g is string => typeof g === 'string')
      : readString(r.genre),
    tone: Array.isArray(r.tone)
      ? r.tone.filter((t): t is string => typeof t === 'string')
      : readString(r.tone),
    centralTheme: readString(r.centralTheme),
    worldRules: worldRulesFromJson(r.worldRules),
    factions: factionsFromJson(r.factions),
    items: namedEntitiesFromJson(r.items),
    events: namedEntitiesFromJson(r.events),
    inspirations: {
      movies: recordArrayFromJson(recordFromJson(r.inspirations).movies).map(inspirationTitle),
      books: recordArrayFromJson(recordFromJson(r.inspirations).books).map(inspirationTitle),
      games: recordArrayFromJson(recordFromJson(r.inspirations).games).map(inspirationTitle),
    },
    sequences: namedRecordsFromJson(r.sequences).map(row => ({
      name: row.name,
      description: readString(row.description),
    })),
    masterPrompt: readString(r.masterPrompt),
  }
}

function flattenSeriesBible(rawBible: Record<string, unknown>): Record<string, unknown> {
  const bible: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawBible)) {
    if (BIBLE_CATEGORY_SET.has(key) && typeof value === 'object' && value !== null) {
      Object.assign(bible, recordFromJson(value))
    } else {
      bible[key] = value
    }
  }
  return bible
}

function slugId(prefix: string, id: string | undefined, name: string): string {
  const suffix = id?.slice(0, 8) ?? name.toLowerCase().replace(/\s+/g, '-')
  return `${prefix}-${suffix}`
}

/** Safe RAG service wrapper — never throws; returns '' on failure. */
async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const { ragService } = await import('@/domains/storyteller/services/RagService')
    const ragResults = await ragService.assembleAgentContext(projectId, ChatSenderAlias.Showrunner, query)

    let ragContext = ''
    if (ragResults.relevantHistory) {
      ragContext += `\n## RELEVANT HISTORY\n${ragResults.relevantHistory}\n`
    }
    if (ragResults.pastDecisions) {
      ragContext += `\n## PAST DECISIONS\n${ragResults.pastDecisions}\n`
    }
    if (ragResults.userPreferences) {
      ragContext += `\n## USER PREFERENCES\n${ragResults.userPreferences}\n`
    }
    return ragContext
  } catch (e) {
    console.warn(ContextAssemblyLog.RagRetrievalFailed, e)
    return ''
  }
}

export async function assembleStorytellerContext(
  params: AssembleContextParams
): Promise<AssembledContext> {
  const { projectId, episodeId, message, currentPhase, userId, onError } = params

  let contextPrompt = ''
  let existingBibleData: Record<string, unknown> = {}

  if (!projectId) {
    return { contextPrompt, existingBibleData }
  }

  const phase = parsePhaseId(currentPhase)

  try {
    const [projectData, storyPlanData, serviceData, ragContext] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .then(r => r[0]),
      db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .then(r => r[0]),
      import('./StorytellerCrudService').then(async m => {
        const [charsReq, beatsReq] = await Promise.all([
          m.storytellerService
            .listCharacters({ projectId }, { userId })
            .catch((): { characters: CharacterRow[] } => ({ characters: [] })),
          episodeId
            ? m.storytellerService
                .listBeats({ episodeId }, { userId })
                .catch((): { beats: BeatRow[] } => ({ beats: [] }))
            : Promise.resolve({ beats: [] satisfies BeatRow[] }),
        ])
        return { characters: charsReq.characters, beats: beatsReq.beats }
      }),
      getRAGContext(projectId, message),
    ])

    const rawBible = recordFromJson(projectData?.seriesBible)
    const storyPlan = storyPlanFromJson(storyPlanData?.content)
    const bible = flattenSeriesBible(rawBible)

    const masterPrompt =
      projectData?.masterPrompt || readString(bible.masterPrompt) || storyPlan.masterPrompt || ''

    const dbCharacters = serviceData.characters.map(characterFromDbRow)
    const planCast = storyPlan.cast ?? storyPlan.keyCharacters ?? []
    const dbNames = new Set(dbCharacters.map(c => c.name.toLowerCase()))
    const characters: Character[] = [
      ...dbCharacters,
      ...planCast.filter(c => c.name && !dbNames.has(c.name.toLowerCase())),
    ]
    const beats: BeatRow[] = serviceData.beats

    const linkReqs = getEntityLinkRequirements()
    const systemCtx = `=== IQ 200 CONTEXT ENGINEERING & ENTITY LINKS ===
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

    const genre =
      Array.isArray(storyPlan.genre)
        ? storyPlan.genre.join(StorytellerAnswerSeparator.CommaSpace)
        : storyPlan.genre || readString(bible.genre) || ContextAssemblyFallback.NotSet
    const tone =
      Array.isArray(storyPlan.tone)
        ? storyPlan.tone.join(StorytellerAnswerSeparator.CommaSpace)
        : storyPlan.tone || readString(bible.tone) || ContextAssemblyFallback.NotSet
    const theme =
      storyPlan.centralTheme || readString(bible.centralTheme) || ContextAssemblyFallback.NotSet
    const premise =
      storyPlan.premise ?? storyPlan.episodePremise ?? recordFromJson(bible.episodePremise)

    const projectCtx = `=== PROJECT ===
Title: ${projectData?.name || StorytellerDefaultTitle.Untitled} | Genre: ${genre} | Tone: ${tone} | Theme: ${theme}

=== EPISODE PREMISE ===
${Object.keys(premise).length > 0 ? JSON.stringify(premise) : ContextAssemblyFallback.NoEpisodePremise}

=== WORLD ===
${storyPlan.worldDescription || readString(bible.worldDescription) || ContextAssemblyFallback.NoWorldDescription}

=== WORLD RULES ===
${storyPlan.worldRules && storyPlan.worldRules.length > 0
        ? storyPlan.worldRules
            .map(
              r =>
                `- [${r.category || BibleCategoryKey.General}] ${r.rule}${r.consequence ? ` → ${r.consequence}` : ''}`
            )
            .join('\n')
        : ContextAssemblyFallback.None
      }

=== FACTIONS ===
${storyPlan.factions && storyPlan.factions.length > 0
        ? storyPlan.factions
            .map(f => {
              const factionId = slugId(EntityRefPrefix.Faction, f.id, f.name)
              return `- [${f.name}][${factionId}]: ${f.ideology || f.description || ContextAssemblyFallback.NoDescription}`
            })
            .join('\n')
        : ContextAssemblyFallback.None
      }

=== ITEMS ===
${storyPlan.items && storyPlan.items.length > 0
        ? storyPlan.items
            .map(i => {
              const itemId = slugId(EntityRefPrefix.Item, i.id, i.name)
              return `- [${i.name}][${itemId}]: ${i.description || ContextAssemblyFallback.NoDescription}`
            })
            .join('\n')
        : ContextAssemblyFallback.None
      }

=== EVENTS ===
${storyPlan.events && storyPlan.events.length > 0
        ? storyPlan.events
            .map(e => {
              const eventId = slugId(EntityRefPrefix.Event, e.id, e.name)
              return `- [${e.name}][${eventId}]: ${e.description || ContextAssemblyFallback.NoDescription}`
            })
            .join('\n')
        : ContextAssemblyFallback.None
      }

=== WORLD RULES (linked) ===
${storyPlan.worldRules && storyPlan.worldRules.length > 0
        ? storyPlan.worldRules
            .map(r => {
              const ruleId = slugId(
                EntityRefPrefix.Rule,
                r.id,
                r.name ?? r.category ?? StoryEntityType.Rule
              )
              return `- [${r.name || r.category || ContextAssemblyFallback.RuleLabel}][${ruleId}]: ${r.rule || ContextAssemblyFallback.NoDescription}`
            })
            .join('\n')
        : ContextAssemblyFallback.None
      }

=== INSPIRATIONS ===
${storyPlan.inspirations
        ? `Movies: ${storyPlan.inspirations.movies?.join(StorytellerAnswerSeparator.CommaSpace) || ContextAssemblyFallback.NoneLabel} | Books: ${storyPlan.inspirations.books?.join(StorytellerAnswerSeparator.CommaSpace) || ContextAssemblyFallback.NoneLabel} | Games: ${storyPlan.inspirations.games?.join(StorytellerAnswerSeparator.CommaSpace) || ContextAssemblyFallback.NoneLabel}`
        : ContextAssemblyFallback.None
      }

=== SEQUENCES ===
${storyPlan.sequences && storyPlan.sequences.length > 0
        ? storyPlan.sequences
            .map((s, i) => `${i + 1}. ${s.name}: ${s.description || ''}`)
            .join('\n')
        : ContextAssemblyFallback.None
      }`

    const sortedChars = [...characters].sort((a, b) => {
      const roleA = (a.role || '').toLowerCase()
      const roleB = (b.role || '').toLowerCase()
      const priorityA = ROLE_PRIORITY[roleA] ?? 99
      const priorityB = ROLE_PRIORITY[roleB] ?? 99
      if (priorityA !== priorityB) return priorityA - priorityB
      return 0
    })

    const charsCtx =
      sortedChars.length > 0
        ? `=== CHARACTERS (${sortedChars.length}) ===\n` +
          sortedChars
            .slice(0, 20)
            .map(c => {
              const charId = slugId(EntityRefPrefix.Character, c.id, c.name)
              return `- [${c.name}][${charId}] (${c.role || '?'}): ${c.description || ContextAssemblyFallback.NoDescription}`
            })
            .join('\n')
        : ''

    const beatsCtx =
      beats.length > 0
        ? `=== RECENT BEATS (${beats.length}) ===\n` +
          beats
            .slice(-3)
            .map(b => {
              const beatId = slugId(EntityRefPrefix.Beat, b.id, String(b.sequence ?? '0'))
              return `- [${b.logline || `Beat ${b.sequence}`}][${beatId}]`
            })
            .join('\n')
        : ''

    const rawParts: RawContextParts = {
      systemPrompt: systemCtx,
      projectContext: projectCtx,
      characters: charsCtx,
      beats: beatsCtx,
      rag: ragContext || undefined,
      userMessage: message,
    }
    const budgeted = budgetContext(rawParts)

    if (budgeted.trimmed.length > 0) {
      console.log(ContextAssemblyLog.TokenBudgetTrimmed, budgeted.trimmed)
    }
    console.log(`[Stream] Context tokens: ~${budgeted.totalTokens}`)

    contextPrompt = budgeted.context
    existingBibleData = rawBible
  } catch (err) {
    console.warn(ContextAssemblyLog.FailedToLoadContext, err)
    onError?.(err)
  }

  return { contextPrompt, existingBibleData }
}
