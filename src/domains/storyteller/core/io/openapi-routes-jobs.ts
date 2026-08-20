import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  OpenApiStorytellerDescription,
  OpenApiStorytellerPath,
  OpenApiStorytellerSummary,
} from '@/domains/storyteller/core/io/constants/openapi-storyteller-wire'
import {
  openApiSuccessMessageSchema,
  stBeatIdParams,
  stConsistencyApplyRequest,
  stConsistencyCheckRequest,
  stConsistencyCheckResponse,
  stConsistencyUndoRequest,
  stEpisodeIdParams,
  stGenerateBeatImageRequest,
  stGenerateCharacterFieldsRequest,
  stGenerateCharacterFieldsResponse,
  stGeneratePortraitRequest,
  stGeneratePosterRequest,
  stJobQueuedResponse,
  stJobStatusResponse,
  stMoodboardTriggerRequest,
  stRunIdQuery,
} from '@/domains/storyteller/core/io/openapi-schemas'
import { OpenApiHttpMethod, OpenApiTag } from '@/shared/openapi/constants/openapi-wire'
import { registerJsonRoute } from '@/shared/openapi/route-helpers'

const tags = [OpenApiTag.Storyteller]

export function registerStorytellerJobRoutes(registry: OpenAPIRegistry): void {
  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.GeneratePortrait,
    tags,
    summary: OpenApiStorytellerSummary.PortraitGenerate,
    body: stGeneratePortraitRequest,
    successStatus: 200,
    successSchema: stJobQueuedResponse,
    successDescription: OpenApiStorytellerDescription.JobQueued,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.GeneratePortraitStatus,
    tags,
    summary: OpenApiStorytellerSummary.PortraitStatus,
    query: stRunIdQuery,
    successStatus: 200,
    successSchema: stJobStatusResponse,
    successDescription: OpenApiStorytellerDescription.JobStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.GenerateCharacterFields,
    tags,
    summary: OpenApiStorytellerSummary.CharacterFieldsGenerate,
    body: stGenerateCharacterFieldsRequest,
    successStatus: 200,
    successSchema: stGenerateCharacterFieldsResponse,
    successDescription: OpenApiStorytellerDescription.CharacterFields,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.GeneratePoster,
    tags,
    summary: OpenApiStorytellerSummary.PosterGenerate,
    params: stEpisodeIdParams,
    body: stGeneratePosterRequest,
    successStatus: 200,
    successSchema: stJobQueuedResponse,
    successDescription: OpenApiStorytellerDescription.JobQueued,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.PosterStatus,
    tags,
    summary: OpenApiStorytellerSummary.PosterStatus,
    query: stRunIdQuery,
    successStatus: 200,
    successSchema: stJobStatusResponse,
    successDescription: OpenApiStorytellerDescription.JobStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.MoodboardTrigger,
    tags,
    summary: OpenApiStorytellerSummary.MoodboardTrigger,
    body: stMoodboardTriggerRequest,
    successStatus: 200,
    successSchema: stJobQueuedResponse,
    successDescription: OpenApiStorytellerDescription.JobQueued,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.MoodboardStatus,
    tags,
    summary: OpenApiStorytellerSummary.MoodboardStatus,
    query: stRunIdQuery,
    successStatus: 200,
    successSchema: stJobStatusResponse,
    successDescription: OpenApiStorytellerDescription.JobStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.BeatGenerateImage,
    tags,
    summary: OpenApiStorytellerSummary.BeatImageGenerate,
    params: stBeatIdParams,
    body: stGenerateBeatImageRequest,
    successStatus: 200,
    successSchema: stJobQueuedResponse,
    successDescription: OpenApiStorytellerDescription.JobQueued,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.BeatStatus,
    tags,
    summary: OpenApiStorytellerSummary.BeatImageStatus,
    query: stRunIdQuery,
    successStatus: 200,
    successSchema: stJobStatusResponse,
    successDescription: OpenApiStorytellerDescription.JobStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.BeatStatus,
    tags,
    summary: OpenApiStorytellerSummary.BeatImageCancel,
    query: stRunIdQuery,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.JobStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.ConsistencyCheck,
    tags,
    summary: OpenApiStorytellerSummary.ConsistencyCheck,
    body: stConsistencyCheckRequest,
    successStatus: 200,
    successSchema: stConsistencyCheckResponse,
    successDescription: OpenApiStorytellerDescription.ConsistencyResult,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.ConsistencyApply,
    tags,
    summary: OpenApiStorytellerSummary.ConsistencyApply,
    body: stConsistencyApplyRequest,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.ConsistencyResult,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.ConsistencyUndo,
    tags,
    summary: OpenApiStorytellerSummary.ConsistencyUndo,
    body: stConsistencyUndoRequest,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.ConsistencyResult,
  })
}
