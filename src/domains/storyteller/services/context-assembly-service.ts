/**
 * Storyteller context assembly.
 *
 * Fetches project/bible/story-plan/characters/beats + RAG, formats them into
 * the agent system context, and enforces the token budget.
 */

import { eq } from 'drizzle-orm'
import { projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import { budgetContext, type RawContextParts } from '@/domains/storyteller/services/context/token-budget'
import {
  StorytellerAnswerSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  characterFromDbRow,
  charactersFromJson,
  deriveProjectMeta,
  flattenSeriesBible,
  mergeCharactersFromPlanAndDb,
  sortCharactersByRole,
  storyPlanFromJson,
  type BeatRow,
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
import { ChatSenderAlias } from '@/shared/chat/core/constants/chat-messages'

export interface AssembleContextParams {
  projectId?: string
  episodeId?: string
  message: string
  currentPhase?: PhaseId
  userId: string
  onError?: (err: unknown) => void
}

export interface AssembledContext {
  contextPrompt: string
  existingBibleData: Record<string, unknown>
}

async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const { ragService } = await import('@/domains/storyteller/services/rag-service')
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

async function loadContextSourceData(
  projectId: string,
  episodeId: string | undefined,
  message: string,
  userId: string
) {
  return Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]),
    db.select().from(storyPlans).where(eq(storyPlans.projectId, projectId)).then(r => r[0]),
    import('./storyteller-crud-service').then(async m => {
      const [charsReq, beatsReq] = await Promise.all([
        m.storytellerService
          .listCharacters({ projectId }, { userId })
          .catch((): { characters: Parameters<typeof characterFromDbRow>[0][] } => ({ characters: [] })),
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
}

function buildContextParts(params: {
  projectId: string
  episodeId?: string
  phase: PhaseId
  message: string
  projectData: Awaited<ReturnType<typeof loadContextSourceData>>[0]
  storyPlanData: Awaited<ReturnType<typeof loadContextSourceData>>[1]
  serviceData: Awaited<ReturnType<typeof loadContextSourceData>>[2]
  ragContext: string
}): { contextPrompt: string; existingBibleData: Record<string, unknown> } {
  const { projectId, episodeId, phase, message, projectData, storyPlanData, serviceData, ragContext } =
    params

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
  const meta = deriveProjectMeta(
    storyPlan,
    bible,
    ContextAssemblyFallback.NotSet,
    StorytellerAnswerSeparator.CommaSpace
  )
  const projectCtx = buildProjectContextBlock({
    projectName: projectData?.name,
    meta,
    storyPlan,
    bible,
  })

  const sortedChars = sortCharactersByRole(characters)
  const rawParts: RawContextParts = {
    systemPrompt: systemCtx,
    projectContext: projectCtx,
    characters: formatCharactersBlock(sortedChars),
    beats: formatBeatsBlock(beats),
    rag: ragContext || undefined,
    userMessage: message,
  }
  const budgeted = budgetContext(rawParts)

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
    const [projectData, storyPlanData, serviceData, ragContext] = await loadContextSourceData(
      projectId,
      episodeId,
      message,
      userId
    )

    return buildContextParts({
      projectId,
      episodeId,
      phase,
      message,
      projectData,
      storyPlanData,
      serviceData,
      ragContext,
    })
  } catch (err) {
    console.warn(ContextAssemblyLog.FailedToLoadContext, err)
    onError?.(err)
    return { contextPrompt: '', existingBibleData: {} }
  }
}
