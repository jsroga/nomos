import { z } from 'zod'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { BibleLockAction } from '@/domains/storyteller/core/io/constants/bible-lock'
import { OpenApiStorytellerSchemaName } from '@/domains/storyteller/core/io/constants/openapi-storyteller-wire'
import {
  storytellerBibleLockQuerySchema,
  storytellerBibleLockResponseSchema,
  storytellerCreateEpisodeRequestSchema,
  storytellerEpisodeResponseSchema,
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
} from '@/domains/storyteller/core/io/storyteller.dto'
import { generateCharacterFieldsRequestSchema, generateCharacterFieldsResponseSchema } from '@/domains/storyteller/services/constants/generate-character-fields'
import { episodePatchRequestSchema } from '@/domains/storyteller/core/io/episode-patch'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import { OpenApiSchemaName } from '@/shared/openapi/constants/openapi-wire'
import { openApiSuccessMessageSchema } from '@/shared/openapi/shared-components'

ensureZodOpenApi()

export const stEpisodesQuery = storytellerEpisodesQuerySchema.openapi(
  OpenApiSchemaName.StorytellerEpisodesQuery
)
export const stCreateEpisodeBody = storytellerCreateEpisodeRequestSchema.openapi(
  OpenApiSchemaName.StorytellerCreateEpisodeRequest
)
export const stEpisodesResponse = storytellerEpisodesResponseSchema.openapi(
  OpenApiSchemaName.StorytellerEpisodesResponse
)
export const stEpisodeResponse = storytellerEpisodeResponseSchema.openapi(
  OpenApiSchemaName.StorytellerEpisodeResponse
)
export const stBibleLockQuery = storytellerBibleLockQuerySchema.openapi(
  OpenApiSchemaName.StorytellerBibleLockQuery
)
export const stBibleLockGetResponse = storytellerBibleLockResponseSchema.openapi(
  OpenApiSchemaName.StorytellerBibleLockResponse
)

const idString = z.string().min(1)

export const stProjectIdQuery = z
  .object({ projectId: idString })
  .openapi(OpenApiStorytellerSchemaName.ProjectIdQuery)

export const stCreateProjectRequest = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    seriesBible: z.record(z.unknown()).optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.CreateProjectRequest)

export const stProject = z
  .object({
    id: idString,
    name: z.string(),
    description: z.string().nullable().optional(),
    userId: z.string().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.Project)

export const stProjectList = z.array(stProject).openapi(OpenApiStorytellerSchemaName.ProjectList)

export const stProjectIdParams = z
  .object({ id: idString })
  .openapi(OpenApiStorytellerSchemaName.ProjectIdParams)

export const stPatchProjectRequest = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    seriesBible: z.record(z.unknown()).optional(),
    storyPlan: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.PatchProjectRequest)

export const stCharacter = z
  .object({
    id: idString,
    projectId: idString,
    name: z.string(),
    role: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    portraitUrl: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.Character)

export const stCharacterList = z
  .array(stCharacter)
  .openapi(OpenApiStorytellerSchemaName.CharacterList)

export const stCreateCharacterRequest = z
  .object({
    projectId: idString,
    name: z.string().min(1),
    role: z.string().optional(),
    gender: z.string().optional(),
    characterPrompt: z.string().optional(),
    description: z.string().optional(),
    portraitUrl: z.string().optional(),
    mbti: z.string().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.CreateCharacterRequest)

export const stPatchCharacterRequest = z
  .object({
    id: idString.optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    description: z.string().optional(),
    portraitUrl: z.string().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.PatchCharacterRequest)

export const stCharacterIdQuery = z
  .object({ id: idString })
  .openapi(OpenApiStorytellerSchemaName.CharacterIdQuery)

export const stCharacterIdParams = z
  .object({ characterId: idString })
  .openapi(OpenApiStorytellerSchemaName.CharacterIdParams)

export const stEpisodeIdParams = z
  .object({ episodeId: idString })
  .openapi(OpenApiStorytellerSchemaName.EpisodeIdParams)

export const stPatchEpisodeRequest = episodePatchRequestSchema.openapi(
  OpenApiStorytellerSchemaName.PatchEpisodeRequest
)

export const stBeat = z
  .object({
    id: idString,
    episodeId: idString,
    sequence: z.number().optional(),
    logline: z.string().nullable().optional(),
    beatType: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    visualHook: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.Beat)

export const stBeatList = z.array(stBeat).openapi(OpenApiStorytellerSchemaName.BeatList)

export const stCreateBeatRequest = z
  .object({
    logline: z.string().optional(),
    beatType: z.string().optional(),
    sequence: z.number().int().optional(),
    content: z.string().optional(),
    visualHook: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.CreateBeatRequest)

export const stPatchBeatRequest = z
  .record(z.unknown())
  .openapi(OpenApiStorytellerSchemaName.PatchBeatRequest)

export const stBeatIdParams = z
  .object({ beatId: idString })
  .openapi(OpenApiStorytellerSchemaName.BeatIdParams)

export const stBibleResponse = z
  .object({
    bible: z.record(z.unknown()),
    seriesBible: z.unknown().optional(),
    storyPlan: z.unknown().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.BibleResponse)

export const stBibleLockPostRequest = z
  .object({
    projectId: idString,
    action: z.nativeEnum(BibleLockAction),
  })
  .openapi(OpenApiStorytellerSchemaName.BibleLockPostRequest)

export const stBibleLockPostResponse = z
  .object({
    success: z.boolean(),
    action: z.nativeEnum(BibleLockAction),
    lockedBy: z.string().nullable(),
    lockedAt: z.string().nullable(),
  })
  .openapi(OpenApiStorytellerSchemaName.BibleLockPostResponse)

export const stRelationshipGraph = z
  .object({
    nodes: z.array(
      z.object({
        id: idString,
        name: z.string(),
        type: z.nativeEnum(StoryEntityType),
        metadata: z.record(z.unknown()),
      })
    ),
    edges: z.array(
      z.object({
        source: idString,
        target: idString,
        weight: z.number(),
        type: z.string(),
        label: z.string().optional(),
        evidence: z.string().optional(),
        llmGrounded: z.boolean().optional(),
      })
    ),
    centralCharacter: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.RelationshipGraph)

export const stPlanQuery = z
  .object({
    episodeId: idString.optional(),
    projectId: idString.optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.PlanQuery)

export const stPlanResponse = z
  .object({
    storyPlan: z.unknown().nullable().optional(),
    planApproved: z.boolean().optional(),
    currentPhase: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.PlanResponse)

export const stSavePlanRequest = z
  .object({
    episodeId: idString.optional(),
    projectId: idString.optional(),
    storyPlan: z.unknown().optional(),
    approved: z.boolean().optional(),
    currentPhase: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.SavePlanRequest)

export const stSavePlanResponse = z
  .object({
    success: z.boolean(),
    episode: z.unknown().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.SavePlanResponse)

export const stTimelineQuery = z
  .object({
    episodeId: idString,
    beatId: idString.optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.TimelineQuery)

export const stTimelineResponse = z
  .array(z.record(z.unknown()))
  .openapi(OpenApiStorytellerSchemaName.TimelineResponse)

export const stWorldSummaryResponse = z
  .object({
    summarize: z.unknown(),
    worldGenPrompt: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.WorldSummaryResponse)

export const stSnapshot = z
  .object({
    beatId: idString,
    characterId: idString,
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.Snapshot)

export const stSnapshotList = z.array(stSnapshot).openapi(OpenApiStorytellerSchemaName.SnapshotList)

export const stUpsertSnapshotRequest = z
  .object({
    beatId: idString,
    characterId: idString,
    stressLevel: z.number().optional(),
    emotionalState: z.string().optional(),
    transformationProgress: z.number().optional(),
    goals: z.array(z.string()).optional(),
    fears: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.UpsertSnapshotRequest)

export const stSnapshotQuery = z
  .object({
    beatId: idString.optional(),
    characterId: idString.optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.SnapshotQuery)

export const stActionRequest = z
  .object({
    action: z.object({
      type: z.string(),
      payload: z.unknown().optional(),
    }),
    projectId: idString.optional(),
    episodeId: idString.optional(),
    traceId: z.string().optional(),
    reasoning: z.string().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.ActionRequest)

export const stActionResponse = z
  .object({
    success: z.boolean().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.ActionResponse)

export const stGeneratePortraitRequest = z
  .object({
    description: z.string().min(1),
    projectId: idString,
    characterId: z.string().uuid().optional(),
    mbti: z.string().optional(),
    motivation: z.string().optional(),
    apiKey: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.GeneratePortraitRequest)

export const stJobQueuedResponse = z
  .object({
    success: z.boolean(),
    handleId: z.string(),
    characterId: z.string().optional(),
    status: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.JobQueuedResponse)

export const stRunIdQuery = z
  .object({ runId: idString })
  .openapi(OpenApiStorytellerSchemaName.RunIdQuery)

export const stJobStatusResponse = z
  .object({
    status: z.string(),
    output: z.unknown().optional(),
    error: z.unknown().optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.JobStatusResponse)

export const stGeneratePosterRequest = z
  .object({
    prompt: z.string().min(1),
    config: z.object({ apiKey: z.string().optional() }).passthrough().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.GeneratePosterRequest)

export const stMoodboardTriggerRequest = z
  .object({
    projectId: idString,
    providerConfig: z.record(z.unknown()).optional(),
    promptIndex: z.number().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.MoodboardTriggerRequest)

export const stGenerateBeatImageRequest = z
  .object({
    prompt: z.string().min(1),
    config: z
      .object({
        apiKey: z.string().optional(),
        modelId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.GenerateBeatImageRequest)

export const stConsistencyCheckRequest = z
  .object({
    projectId: idString,
    episodeId: z.string().optional(),
    trigger: z.object({ context: z.unknown() }).passthrough(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.ConsistencyCheckRequest)

export const stConsistencyCheckResponse = z
  .object({
    inconsistencies: z.array(z.record(z.unknown())).optional(),
    fixes: z.array(z.record(z.unknown())).optional(),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.ConsistencyCheckResponse)

export const stConsistencyApplyRequest = z
  .object({
    projectId: idString,
    episodeId: z.string().optional(),
    fixes: z.array(z.record(z.unknown())),
  })
  .passthrough()
  .openapi(OpenApiStorytellerSchemaName.ConsistencyApplyRequest)

export const stConsistencyUndoRequest = z
  .object({
    projectId: idString,
    episodeId: z.string().optional(),
    undoId: z.string().optional(),
  })
  .openapi(OpenApiStorytellerSchemaName.ConsistencyUndoRequest)

export const stGenerateCharacterFieldsRequest = generateCharacterFieldsRequestSchema.openapi(
  OpenApiStorytellerSchemaName.GenerateCharacterFieldsRequest
)

export const stGenerateCharacterFieldsResponse = generateCharacterFieldsResponseSchema.openapi(
  OpenApiStorytellerSchemaName.GenerateCharacterFieldsResponse
)

export { openApiSuccessMessageSchema }
