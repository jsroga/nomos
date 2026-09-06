import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import { beats, characters, episodes, setups } from '@/db/schema'
import {
  STORYTELLER_EPISODE_ID,
  STORYTELLER_PROJECT_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { currentGatewayContext } from '@/shared/ai/gateway/call-context'
import { embed } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { BibleToolError } from './bible-tools-update'
import {
  SEARCH_MANUSCRIPT_TOOL_DESC,
  SEARCH_MANUSCRIPT_TOOL_ID,
} from './manage-tools-wire'
import {
  characterNameCollisions,
  ManuscriptSearchSource,
  type ManuscriptSearchDoc,
} from './search-manuscript-literal'
import { ManuscriptSearchMode } from './search-manuscript-embed'
import { resolveManuscriptHits } from './search-manuscript-resolve'

const SearchManuscriptInputSchema = z.object({
  query: z.string().min(1).describe('Literal plant, phrase, or name token to find'),
  episodeId: z.string().uuid().optional().describe('Limit script and beats to this episode'),
})

const SearchManuscriptHitSchema = z.object({
  source: z.nativeEnum(ManuscriptSearchSource),
  id: z.string(),
  snippet: z.string(),
})

const SearchManuscriptOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  hits: z.array(SearchManuscriptHitSchema),
  nameCollisions: z.array(z.object({ id: z.string(), name: z.string() })),
  mode: z.nativeEnum(ManuscriptSearchMode),
})

enum SearchManuscriptCopy {
  QueryRequired = 'query is required',
  Ok = 'Literal manuscript search complete.',
  EmbeddingOk = 'Embedding manuscript search complete.',
}

export const searchManuscriptTool = createTool({
  id: SEARCH_MANUSCRIPT_TOOL_ID,
  description: SEARCH_MANUSCRIPT_TOOL_DESC,
  inputSchema: SearchManuscriptInputSchema,
  outputSchema: SearchManuscriptOutputSchema,
  execute: async (inputData, context) => {
    const projectId = requestContextString(context.requestContext, STORYTELLER_PROJECT_ID)
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId
    const query = inputData.query.trim()
    if (!projectId) {
      return {
        success: false,
        message: BibleToolError.ProjectIdRequired,
        hits: [],
        nameCollisions: [],
        mode: ManuscriptSearchMode.Literal,
      }
    }
    if (query.length === 0) {
      return {
        success: false,
        message: SearchManuscriptCopy.QueryRequired,
        hits: [],
        nameCollisions: [],
        mode: ManuscriptSearchMode.Literal,
      }
    }

    const episodeFilter = episodeId ? eq(episodes.id, episodeId) : undefined
    const [scriptRows, beatRows, setupRows, characterRows] = await Promise.all([
      db
        .select({ id: episodes.id, scriptContent: episodes.scriptContent })
        .from(episodes)
        .where(episodeFilter ? and(eq(episodes.projectId, projectId), episodeFilter) : eq(episodes.projectId, projectId)),
      db
        .select({ id: beats.id, content: beats.content })
        .from(beats)
        .innerJoin(episodes, eq(beats.episodeId, episodes.id))
        .where(
          episodeId
            ? and(eq(episodes.projectId, projectId), eq(beats.episodeId, episodeId))
            : eq(episodes.projectId, projectId)
        ),
      db
        .select({ id: setups.id, description: setups.description })
        .from(setups)
        .where(eq(setups.projectId, projectId)),
      db
        .select({ id: characters.id, name: characters.name })
        .from(characters)
        .where(eq(characters.projectId, projectId)),
    ])

    const docs: ManuscriptSearchDoc[] = [
      ...scriptRows.map(row => ({
        source: ManuscriptSearchSource.Script,
        id: row.id,
        text: row.scriptContent ?? '',
      })),
      ...beatRows.map(row => ({
        source: ManuscriptSearchSource.Beat,
        id: row.id,
        text: row.content ?? '',
      })),
      ...setupRows.map(row => ({
        source: ManuscriptSearchSource.Setup,
        id: row.id,
        text: row.description,
      })),
    ]
    const gateway = currentGatewayContext()
    const resolved = await resolveManuscriptHits({
      docs,
      query,
      embedTexts: gateway
        ? texts =>
            embed({
              scope: gateway.scope,
              feature: LlmFeature.RagEmbedding,
              texts,
              traceId: gateway.traceId,
            })
        : undefined,
    })
    return {
      success: true,
      message:
        resolved.mode === ManuscriptSearchMode.Embedding
          ? SearchManuscriptCopy.EmbeddingOk
          : SearchManuscriptCopy.Ok,
      hits: resolved.hits,
      nameCollisions: characterNameCollisions(characterRows, query),
      mode: resolved.mode,
    }
  },
})
