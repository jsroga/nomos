import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'
import {
  storytellerBibleLockQuerySchema,
  storytellerBibleLockResponseSchema,
  storytellerCreateEpisodeRequestSchema,
  storytellerEpisodeResponseSchema,
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
} from '@/domains/storyteller/core/io/storyteller.dto'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import {
  OpenApiComponentResponse,
  OpenApiHttpMethod,
  OpenApiMediaType,
  OpenApiPath,
  OpenApiRouteDescription,
  OpenApiRouteSummary,
  OpenApiSchemaName,
  OpenApiTag,
} from '@/shared/openapi/constants/openapi-wire'
import {
  refResponse,
  sessionOrApiKeySecurity,
} from '@/shared/openapi/shared-components'

ensureZodOpenApi()

const episodesQuery = storytellerEpisodesQuerySchema.openapi(
  OpenApiSchemaName.StorytellerEpisodesQuery
)
const createEpisodeBody = storytellerCreateEpisodeRequestSchema.openapi(
  OpenApiSchemaName.StorytellerCreateEpisodeRequest
)
const episodesResponse = storytellerEpisodesResponseSchema.openapi(
  OpenApiSchemaName.StorytellerEpisodesResponse
)
const episodeResponse = storytellerEpisodeResponseSchema.openapi(
  OpenApiSchemaName.StorytellerEpisodeResponse
)
const bibleLockQuery = storytellerBibleLockQuerySchema.openapi(
  OpenApiSchemaName.StorytellerBibleLockQuery
)
const bibleLockResponse = storytellerBibleLockResponseSchema.openapi(
  OpenApiSchemaName.StorytellerBibleLockResponse
)

function jsonBody(schema: z.ZodType) {
  return {
    required: true,
    content: { [OpenApiMediaType.Json]: { schema } },
  }
}

function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: { [OpenApiMediaType.Json]: { schema } },
  }
}

export function registerStorytellerPublicRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.StorytellerEpisodes,
    tags: [OpenApiTag.Storyteller],
    summary: OpenApiRouteSummary.EpisodesList,
    security: sessionOrApiKeySecurity,
    request: { query: episodesQuery },
    responses: {
      200: jsonResponse(episodesResponse, OpenApiRouteDescription.EpisodeList),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.StorytellerEpisodes,
    tags: [OpenApiTag.Storyteller],
    summary: OpenApiRouteSummary.EpisodesCreate,
    security: sessionOrApiKeySecurity,
    request: { body: jsonBody(createEpisodeBody) },
    responses: {
      200: jsonResponse(episodeResponse, OpenApiRouteDescription.EpisodeCreated),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.StorytellerBibleLock,
    tags: [OpenApiTag.Storyteller],
    summary: OpenApiRouteSummary.BibleLockGet,
    security: sessionOrApiKeySecurity,
    request: { query: bibleLockQuery },
    responses: {
      200: jsonResponse(bibleLockResponse, OpenApiRouteDescription.LockStatus),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })
}
