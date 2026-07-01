/**
 * Storyteller context assembly.
 *
 * Fetches project/bible/story-plan/characters/beats + RAG, formats them into
 * the agent system context, and enforces the token budget. Extracted from the
 * chat stream route to keep that handler focused on orchestration.
 */

import { eq } from 'drizzle-orm'
import { projects, storyPlans } from '@/db'
import { db } from '@/lib/db'
import { budgetContext, type RawContextParts } from '@/domains/storyteller/services/context/token-budget'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'

export interface Character {
  id: string
  name: string
  role?: string
  description?: string
  psychology?: Record<string, unknown>
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
  worldRules?: Array<{ category?: string; rule: string; consequence?: string }>
  factions?: Array<{ id?: string; name: string; ideology?: string; description?: string }>
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
  currentPhase?: string
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

/** Safe RAG service wrapper — never throws; returns '' on failure. */
async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const { ragService } = await import('@/domains/storyteller/services/RagService')
    const ragResults = await ragService.assembleAgentContext(projectId, 'showrunner', query)

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
    console.warn('RAG context retrieval failed:', e)
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

  try {
    // Parallel fetch ALL data for rich context
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
      import('@/services/storyteller.service').then(async m => {
        const [charsReq, beatsReq] = await Promise.all([
          m.storytellerService
            .listCharacters({ projectId }, { userId })
            .catch(() => ({ characters: [] })),
          episodeId
            ? m.storytellerService
              .listBeats({ episodeId }, { userId })
              .catch(() => ({ beats: [] }))
            : Promise.resolve({ beats: [] }),
        ])
        return { characters: charsReq.characters || [], beats: beatsReq.beats || [] }
      }),
      getRAGContext(projectId, message),
    ])

    const rawBible = (projectData?.seriesBible as Record<string, unknown>) || {}
    const storyPlan = ((storyPlanData?.content as unknown) as StoryPlan) || ({} as StoryPlan)

    // Flatten nested category objects from seriesBible (e.g., 'Setting', 'History', etc.)
    const knownCategories = [
      'General',
      'Setting',
      'History',
      'Magic',
      'Factions',
      'Technology',
      'Culture',
    ]
    const bible: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawBible)) {
      if (knownCategories.includes(key) && typeof value === 'object' && value !== null) {
        Object.assign(bible, value)
      } else {
        bible[key] = value
      }
    }

    // masterPrompt is a TOP-LEVEL column on projects table, not nested in seriesBible
    const masterPrompt =
      projectData?.masterPrompt || bible.masterPrompt || storyPlan.masterPrompt || ''
    // Merge characters from DB table AND storyPlan.keyCharacters/cast
    const dbCharacters = (serviceData.characters as Character[]) || []
    const planCast = storyPlan.cast || storyPlan.keyCharacters || []
    const dbNames = new Set(dbCharacters.map(c => c.name?.toLowerCase()))
    const mergedCharacters = [
      ...dbCharacters,
      ...planCast.filter(c => c?.name && !dbNames.has(c.name.toLowerCase())),
    ]
    const characters = mergedCharacters
    const beats = serviceData.beats || []

    // Build context with token budget enforcement
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
currentPhase: ${currentPhase || 'premise'}
IMPORTANT: When calling tools that require projectId, you MUST use: "${projectId}"
${episodeId ? `When calling tools that require episodeId, you MUST use: "${episodeId}"` : ''}
CURRENT STORY PHASE: ${currentPhase || 'premise'}
- premise: Concept planning, world building, episode premise.
- breaking: Plot structure, beat board organization.
- writing: Scripting and dialogue execution.
⚠️ REFERENCE ONLY: Content below is for world/history consistency. When asked to GENERATE, create NEW content.
${masterPrompt ? `\n=== MASTER PROMPT ===\n${masterPrompt}` : ''}
`

    const projectCtx = `=== PROJECT ===
Title: ${projectData?.name || 'Untitled'} | Genre: ${Array.isArray(storyPlan.genre) ? storyPlan.genre.join(', ') : storyPlan.genre || bible.genre || 'Not set'} | Tone: ${Array.isArray(storyPlan.tone) ? storyPlan.tone.join(', ') : storyPlan.tone || bible.tone || 'Not set'} | Theme: ${storyPlan.centralTheme || bible.centralTheme || 'Not set'}

=== EPISODE PREMISE ===
${storyPlan.premise || storyPlan.episodePremise || bible.episodePremise
        ? JSON.stringify(storyPlan.premise || storyPlan.episodePremise || bible.episodePremise)
        : 'No episode premise yet'
      }

=== WORLD ===
${storyPlan.worldDescription || bible.worldDescription || 'No world description yet'}

=== WORLD RULES ===
${Array.isArray(storyPlan.worldRules) && storyPlan.worldRules.length > 0
        ? storyPlan.worldRules
          .map(
            (r: any) =>
              `- [${r.category || 'General'}] ${r.rule}${r.consequence ? ` → ${r.consequence}` : ''}`
          )
          .join('\n')
        : '(none)'
      }

=== FACTIONS ===
${Array.isArray(storyPlan.factions) && storyPlan.factions.length > 0
        ? storyPlan.factions
          .map((f: any) => {
            const factionId = `faction-${f.id?.slice(0, 8) || f.name.toLowerCase().replace(/\s+/g, '-')}`
            return `- [${f.name}][${factionId}]: ${f.ideology || f.description || 'No description'}`
          })
          .join('\n')
        : '(none)'
      }

=== ITEMS ===
${Array.isArray((storyPlan as any).items) && (storyPlan as any).items.length > 0
        ? (storyPlan as any).items
          .map((i: any) => {
            const itemId = 'item-' + (i.id?.slice(0, 8) || i.name.toLowerCase().replace(/\s+/g, '-'))
            return '- [' + i.name + '][' + itemId + ']: ' + (i.description || 'No description')
          })
          .join('\n')
        : '(none)'
      }

=== EVENTS ===
${Array.isArray((storyPlan as any).events) && (storyPlan as any).events.length > 0
        ? (storyPlan as any).events
          .map((e: any) => {
            const eventId = 'event-' + (e.id?.slice(0, 8) || e.name.toLowerCase().replace(/\s+/g, '-'))
            return '- [' + e.name + '][' + eventId + ']: ' + (e.description || 'No description')
          })
          .join('\n')
        : '(none)'
      }

=== WORLD RULES ===
${Array.isArray((storyPlan as any).worldRules) && (storyPlan as any).worldRules.length > 0
        ? (storyPlan as any).worldRules
          .map((r: any) => {
            const ruleId = 'rule-' + (r.id?.slice(0, 8) || r.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown')
            return `- [${r.name || r.category || 'Rule'}][${ruleId}]: ${r.rule || 'No description'}`
          })
          .join('\n')
        : '(none)'
      }

=== INSPIRATIONS ===
${storyPlan.inspirations ? `Movies: ${Array.isArray(storyPlan.inspirations.movies) ? storyPlan.inspirations.movies.map((m: any) => (typeof m === 'string' ? m : m.title)).join(', ') : 'None'} | Books: ${Array.isArray(storyPlan.inspirations.books) ? storyPlan.inspirations.books.map((b: any) => (typeof b === 'string' ? b : b.title)).join(', ') : 'None'} | Games: ${Array.isArray(storyPlan.inspirations.games) ? storyPlan.inspirations.games.map((g: any) => (typeof g === 'string' ? g : g.title)).join(', ') : 'None'}` : '(none)'}

=== SEQUENCES ===
${Array.isArray(storyPlan.sequences) && storyPlan.sequences.length > 0
        ? storyPlan.sequences
          .map((s: any, i: number) => `${i + 1}. ${s.name}: ${s.description || ''}`)
          .join('\n')
        : '(none)'
      }`

    // Characters: sorted by role priority, capped
    const rolePriority: Record<string, number> = {
      'protagonist': 1,
      'hero': 1,
      'main': 1,
      'antagonist': 2,
      'villain': 2,
      'mentor': 3,
      'guide': 3,
      'supporting': 4,
      'side': 5,
    }

    const sortedChars = [...characters].sort((a, b) => {
      const roleA = (a.role || '').toLowerCase()
      const roleB = (b.role || '').toLowerCase()
      const priorityA = rolePriority[roleA] || 99
      const priorityB = rolePriority[roleB] || 99
      if (priorityA !== priorityB) return priorityA - priorityB
      return 0
    })

    const charsCtx =
      sortedChars.length > 0
        ? `=== CHARACTERS (${sortedChars.length}) ===\n` +
        sortedChars
          .slice(0, 20)
          .map((c: any) => {
            const charId = `char-${c.id?.slice(0, 8) || c.name.toLowerCase().replace(/\s+/g, '-')}`
            return `- [${c.name}][${charId}] (${c.role || '?'}): ${c.description || 'No description'}`
          })
          .join('\n')
        : ''

    const beatsCtx =
      beats.length > 0
        ? `=== RECENT BEATS (${beats.length}) ===\n` +
        beats
          .slice(-3)
          .map((b: any) => {
            const beatId = `beat-${b.id?.slice(0, 8)}`
            return `- [${b.logline || `Beat ${b.sequence}`}][${beatId}]`
          })
          .join('\n')
        : ''

    // Apply token budget enforcement — truncates any section that exceeds its limit
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
      console.log('[Stream] Token budget trimmed sections:', budgeted.trimmed)
    }
    console.log(`[Stream] Context tokens: ~${budgeted.totalTokens}`)

    contextPrompt = budgeted.context
    existingBibleData = rawBible
  } catch (err) {
    console.warn('Failed to load context for stream:', err)
    onError?.(err)
  }

  return { contextPrompt, existingBibleData }
}
