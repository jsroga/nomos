/**
 * Storyteller context assembly.
 *
 * Fetches project/bible/story-plan/characters/beats + RAG, formats them into
 * the agent system context, and enforces the token budget.
 */

import { eq, sql } from 'drizzle-orm'
import { episodes, projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import { budgetContext, withRecalledMemory, type RawContextParts } from '@/domains/storyteller/services/context/token-budget'
import {
  StorytellerAnswerSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { readRowString, readString, recordFromJson, sqlResultRows } from '@/shared/data/json-guards'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { INHERITED_AGENT_LAST_MESSAGES } from '@/shared/agent-kernel/mastra/studio-memory'
import {
  characterFromDbRow,
  charactersFromJson,
  deriveProjectMeta,
  episodeIndexLogline,
  flattenSeriesBible,
  resolveContextEpisodePremise,
  mergeCharactersFromPlanAndDb,
  sortCharactersByRole,
  storyPlanFromJson,
  type BeatRow,
  type EpisodeIndexRow,
} from './context-assembly-parsers'
import {
  buildProjectContextBlock,
  buildSystemContextBlock,
  formatBeatsBlock,
  formatCharactersBlock,
} from './context-assembly-formatters'

export type { Character, StoryPlan } from './context-assembly-parsers'

import {
  BIBLE_CATEGORY_KEYS,
  ContextAssemblyFallback,
  ContextAssemblyLog,
} from '@/domains/storyteller/services/constants/context-assembly'

export interface AssembleContextParams {
  projectId?: string
  episodeId?: string
  message: string
  currentPhase?: PhaseId
  userId: string
  recalledMemory?: string
  onError?: (err: unknown) => void
}

export interface AssembledContext {
  contextPrompt: string
  existingBibleData: Record<string, unknown>
}

async function loadContextSourceData(
  projectId: string,
  episodeId: string | undefined,
  userId: string
) {
  const [projectRows, storyPlanRows, projectEpisodes, serviceData] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)),
    db.select().from(storyPlans).where(eq(storyPlans.projectId, projectId)),
    db.select().from(episodes).where(eq(episodes.projectId, projectId)),
    (async () => {
      const m = await import('./storyteller-crud-service')
      const [charsReq, beatsReq] = await Promise.all([
        (async () => {
          try {
            return await m.storytellerService.listCharacters({ projectId }, { userId })
          } catch {
            return { characters: [] satisfies Parameters<typeof characterFromDbRow>[0][] }
          }
        })(),
        (async () => {
          if (!episodeId) return { beats: [] satisfies BeatRow[] }
          try {
            return await m.storytellerService.listBeats({ episodeId }, { userId })
          } catch {
            return { beats: [] satisfies BeatRow[] }
          }
        })(),
      ])
      return { characters: charsReq.characters, beats: beatsReq.beats }
    })(),
  ])
  return [projectRows[0], storyPlanRows[0], projectEpisodes, serviceData] as const
}

enum RecalledMemoryTable {
  Messages = 'mastra_messages',
}

enum RecalledMemoryColumn {
  ThreadId = 'thread_id',
  Content = 'content',
  CreatedAt = 'createdAt',
}

async function loadRecalledMemoryText(
  projectId: string,
  episodeId: string | undefined,
  userId: string,
): Promise<string | undefined> {
  const bound = memoryRef({ projectId, episodeId, userId })
  try {
    const result = await db.execute(sql`
      SELECT ${sql.raw(RecalledMemoryColumn.Content)}::text AS ${sql.raw(RecalledMemoryColumn.Content)}
      FROM ${sql.raw(RecalledMemoryTable.Messages)}
      WHERE ${sql.raw(RecalledMemoryColumn.ThreadId)} = ${bound.thread}
      ORDER BY ${sql.raw(`"${RecalledMemoryColumn.CreatedAt}"`)} ASC
      LIMIT ${INHERITED_AGENT_LAST_MESSAGES}
    `)
    const texts = sqlResultRows(result).flatMap(row => {
      const value = readRowString(row, RecalledMemoryColumn.Content)
      return value ? [value] : []
    })
    if (texts.length === 0) return undefined
    return texts.join('\n')
  } catch {
    return undefined
  }
}

function buildContextParts(params: {
  projectId: string
  episodeId?: string
  phase: PhaseId
  message: string
  projectData: Awaited<ReturnType<typeof loadContextSourceData>>[0]
  storyPlanData: Awaited<ReturnType<typeof loadContextSourceData>>[1]
  projectEpisodes: Awaited<ReturnType<typeof loadContextSourceData>>[2]
  serviceData: Awaited<ReturnType<typeof loadContextSourceData>>[3]
  recalledMemory?: string
}): { contextPrompt: string; existingBibleData: Record<string, unknown> } {
  const {
    projectId,
    episodeId,
    phase,
    message,
    projectData,
    storyPlanData,
    projectEpisodes,
    serviceData,
    recalledMemory,
  } = params
  const episodeData = projectEpisodes.find(row => row.id === episodeId)

  const rawBible = parseSeriesBibleRecord(projectData?.seriesBible)
  const storyPlan = storyPlanFromJson(storyPlanData?.content)
  const bible = flattenSeriesBible(rawBible, BIBLE_CATEGORY_KEYS)

  const masterPrompt =
    projectData?.masterPrompt ||
    readString(bible.masterPrompt) ||
    readString(recordFromJson(storyPlan).masterPrompt) ||
    ''

  const dbCharacters = serviceData.characters.map(characterFromDbRow)
  const planRecord = recordFromJson(storyPlan)
  const planCast =
    charactersFromJson(planRecord.cast).length > 0
      ? charactersFromJson(planRecord.cast)
      : charactersFromJson(planRecord.keyCharacters)
  const characters = mergeCharactersFromPlanAndDb(dbCharacters, planCast)
  const beats = serviceData.beats

  const systemCtx = buildSystemContextBlock({ projectId, episodeId, phase, masterPrompt })
  const episodePremise = resolveContextEpisodePremise({
    episodeStoryPlan: episodeData?.storyPlan,
    episodePremiseText: episodeData?.premise,
    episodeTenPoints: episodeData?.tenPointsPlan,
    projectStoryPlan: storyPlan,
    bible,
  })
  const meta = deriveProjectMeta(
    storyPlan,
    bible,
    ContextAssemblyFallback.NotSet,
    StorytellerAnswerSeparator.CommaSpace,
    episodePremise
  )
  const episodeIndex: EpisodeIndexRow[] = [...projectEpisodes]
    .sort((left, right) => left.sequence - right.sequence)
    .map(row => ({
      sequence: row.sequence,
      title: row.title ?? '',
      logline: episodeIndexLogline(row),
    }))
  const projectCtx = buildProjectContextBlock({
    projectName: projectData?.name,
    meta,
    storyPlan,
    bible,
    episodeSequence: episodeData?.sequence,
    episodeIndex,
  })

  const sortedChars = sortCharactersByRole(characters)
  const rawParts: RawContextParts = {
    systemPrompt: systemCtx,
    projectContext: projectCtx,
    characters: formatCharactersBlock(sortedChars),
    beats: formatBeatsBlock(beats),
    userMessage: message,
  }
  const budgeted = budgetContext(withRecalledMemory(rawParts, recalledMemory))

  if (budgeted.trimmed.length > 0) {
    console.log(ContextAssemblyLog.TokenBudgetTrimmed, budgeted.trimmed)
  }
  console.log(`[Stream] Context tokens: ~${budgeted.totalTokens}`)

  return { contextPrompt: budgeted.context, existingBibleData: rawBible }
}

export async function assembleStorytellerContext(
  params: AssembleContextParams
): Promise<AssembledContext> {
  const { projectId, episodeId, message, currentPhase, userId, onError } = params

  if (!projectId) {
    return { contextPrompt: '', existingBibleData: {} }
  }

  const phase = parsePhaseId(currentPhase)

  try {
    const startedAt = Date.now()
    const [projectData, storyPlanData, projectEpisodes, serviceData] = await loadContextSourceData(
      projectId,
      episodeId,
      userId
    )
    const recalledMemory =
      params.recalledMemory ?? (await loadRecalledMemoryText(projectId, episodeId, userId))
    console.log(`${ContextAssemblyLog.SourcesLoadedIn}${Date.now() - startedAt}ms`)

    return buildContextParts({
      projectId,
      episodeId,
      phase,
      message,
      projectData,
      storyPlanData,
      projectEpisodes,
      serviceData,
      recalledMemory,
    })
  } catch (err) {
    console.warn(ContextAssemblyLog.FailedToLoadContext, err)
    onError?.(err)
    return { contextPrompt: '', existingBibleData: {} }
  }
}
