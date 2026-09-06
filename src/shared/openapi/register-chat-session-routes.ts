import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  OpenApiComponentResponse,
  OpenApiHttpMethod,
  OpenApiPath,
  OpenApiRouteDescription,
  OpenApiRouteSummary,
  OpenApiTag,
} from '@/shared/openapi/constants/openapi-wire'
import { jsonBody, jsonResponse } from '@/shared/openapi/route-helpers'
import { refResponse, sessionSecurity } from '@/shared/openapi/shared-components'
import {
  openApiChatSessionIdParamsSchema,
  openApiChatSessionListSchema,
  openApiChatSessionMessagesResponseSchema,
  openApiChatSessionSchema,
  openApiChatSessionsQuerySchema,
  openApiCreateChatSessionRequestSchema,
  openApiPatchChatSessionRequestSchema,
} from '@/shared/openapi/schemas/chat-sessions'

export function registerChatSessionPublicRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.ChatSessions,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionsList,
    description: OpenApiRouteDescription.ChatSessionList,
    security: sessionSecurity,
    request: { query: openApiChatSessionsQuerySchema },
    responses: {
      200: jsonResponse(openApiChatSessionListSchema, OpenApiRouteDescription.ChatSessionList),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.ChatSessions,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionsCreate,
    description: OpenApiRouteDescription.ChatSessionCreated,
    security: sessionSecurity,
    request: { body: jsonBody(openApiCreateChatSessionRequestSchema) },
    responses: {
      201: jsonResponse(openApiChatSessionSchema, OpenApiRouteDescription.ChatSessionCreated),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.ChatSessionById,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionGet,
    description: OpenApiRouteDescription.ChatSession,
    security: sessionSecurity,
    request: { params: openApiChatSessionIdParamsSchema },
    responses: {
      200: jsonResponse(openApiChatSessionSchema, OpenApiRouteDescription.ChatSession),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Patch,
    path: OpenApiPath.ChatSessionById,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionPatch,
    description: OpenApiRouteDescription.ChatSession,
    security: sessionSecurity,
    request: {
      params: openApiChatSessionIdParamsSchema,
      body: jsonBody(openApiPatchChatSessionRequestSchema),
    },
    responses: {
      200: jsonResponse(openApiChatSessionSchema, OpenApiRouteDescription.ChatSession),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Delete,
    path: OpenApiPath.ChatSessionById,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionDelete,
    description: OpenApiRouteDescription.ChatSessionDeleted,
    security: sessionSecurity,
    request: { params: openApiChatSessionIdParamsSchema },
    responses: {
      204: { description: OpenApiRouteDescription.ChatSessionDeleted },
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.ChatSessionMessages,
    tags: [OpenApiTag.Chat],
    summary: OpenApiRouteSummary.ChatSessionMessagesGet,
    description: OpenApiRouteDescription.ChatSessionMessages,
    security: sessionSecurity,
    request: { params: openApiChatSessionIdParamsSchema },
    responses: {
      200: jsonResponse(
        openApiChatSessionMessagesResponseSchema,
        OpenApiRouteDescription.ChatSessionMessages,
      ),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })
}
