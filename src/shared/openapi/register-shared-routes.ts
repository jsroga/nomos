import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'
import {
  OpenApiComponentResponse,
  OpenApiHttpMethod,
  OpenApiMediaType,
  OpenApiPath,
  OpenApiRouteDescription,
  OpenApiRouteSummary,
  OpenApiTag,
} from '@/shared/openapi/constants/openapi-wire'
import {
  apiKeyCreateResponseSchema,
  apiKeyDeleteQuerySchema,
  apiKeyListResponseSchema,
  createApiKeyRequestSchema,
} from '@/shared/openapi/schemas/api-keys'
import {
  openApiCreateEntityRequestSchema,
  openApiCreateRelationshipRequestSchema,
  openApiEntitiesListResponseSchema,
  openApiEntityIdParamsSchema,
  openApiEntityResponseSchema,
  openApiListEntitiesQuerySchema,
  openApiListRelationshipsQuerySchema,
  openApiRelationshipResponseSchema,
  openApiRelationshipsListResponseSchema,
  openApiUpdateEntityRequestSchema,
} from '@/shared/openapi/schemas/entities'
import {
  openApiJsonRpcRequestSchema,
  openApiJsonRpcResponseSchema,
} from '@/shared/openapi/schemas/mcp'
import {
  apiKeySecurity,
  openApiSuccessMessageSchema,
  refResponse,
  sessionOrApiKeySecurity,
  sessionSecurity,
} from '@/shared/openapi/shared-components'

function jsonBody(schema: z.ZodType, required = true) {
  return {
    required,
    content: {
      [OpenApiMediaType.Json]: { schema },
    },
  }
}

function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      [OpenApiMediaType.Json]: { schema },
    },
  }
}

export function registerSharedPublicRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.Mcp,
    tags: [OpenApiTag.Mcp],
    summary: OpenApiRouteSummary.McpPost,
    description: OpenApiRouteDescription.McpPost,
    security: apiKeySecurity,
    request: {
      body: jsonBody(openApiJsonRpcRequestSchema),
    },
    responses: {
      200: jsonResponse(openApiJsonRpcResponseSchema, OpenApiRouteDescription.JsonRpcResponse),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.ApiKeys,
    tags: [OpenApiTag.ApiKeys],
    summary: OpenApiRouteSummary.ApiKeysList,
    description: OpenApiRouteDescription.ApiKeysList,
    security: sessionSecurity,
    responses: {
      200: jsonResponse(apiKeyListResponseSchema, OpenApiRouteDescription.ApiKeyList),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.ApiKeys,
    tags: [OpenApiTag.ApiKeys],
    summary: OpenApiRouteSummary.ApiKeysCreate,
    description: OpenApiRouteDescription.ApiKeysCreate,
    security: sessionSecurity,
    request: {
      body: jsonBody(createApiKeyRequestSchema),
    },
    responses: {
      201: jsonResponse(apiKeyCreateResponseSchema, OpenApiRouteDescription.ApiKeyCreated),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Delete,
    path: OpenApiPath.ApiKeys,
    tags: [OpenApiTag.ApiKeys],
    summary: OpenApiRouteSummary.ApiKeysRevoke,
    security: sessionSecurity,
    request: {
      query: apiKeyDeleteQuerySchema,
    },
    responses: {
      200: jsonResponse(openApiSuccessMessageSchema, OpenApiRouteDescription.KeyRevoked),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.Entities,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.EntitiesList,
    security: sessionOrApiKeySecurity,
    request: {
      query: openApiListEntitiesQuerySchema,
    },
    responses: {
      200: jsonResponse(openApiEntitiesListResponseSchema, OpenApiRouteDescription.EntityList),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.Entities,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.EntitiesCreate,
    security: sessionOrApiKeySecurity,
    request: {
      body: jsonBody(openApiCreateEntityRequestSchema),
    },
    responses: {
      201: jsonResponse(openApiEntityResponseSchema, OpenApiRouteDescription.EntityCreated),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.EntityById,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.EntitiesGet,
    security: sessionOrApiKeySecurity,
    request: {
      params: openApiEntityIdParamsSchema,
    },
    responses: {
      200: jsonResponse(openApiEntityResponseSchema, OpenApiRouteDescription.Entity),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Patch,
    path: OpenApiPath.EntityById,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.EntitiesUpdate,
    security: sessionOrApiKeySecurity,
    request: {
      params: openApiEntityIdParamsSchema,
      body: jsonBody(openApiUpdateEntityRequestSchema),
    },
    responses: {
      200: jsonResponse(openApiEntityResponseSchema, OpenApiRouteDescription.EntityUpdated),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Delete,
    path: OpenApiPath.EntityById,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.EntitiesDelete,
    security: sessionOrApiKeySecurity,
    request: {
      params: openApiEntityIdParamsSchema,
    },
    responses: {
      200: jsonResponse(openApiSuccessMessageSchema, OpenApiRouteDescription.Deleted),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.EntityRelationships,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.RelationshipsList,
    security: sessionOrApiKeySecurity,
    request: {
      query: openApiListRelationshipsQuerySchema,
    },
    responses: {
      200: jsonResponse(
        openApiRelationshipsListResponseSchema,
        OpenApiRouteDescription.Relationships
      ),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.EntityRelationships,
    tags: [OpenApiTag.Entities],
    summary: OpenApiRouteSummary.RelationshipsCreate,
    security: sessionOrApiKeySecurity,
    request: {
      body: jsonBody(openApiCreateRelationshipRequestSchema),
    },
    responses: {
      201: jsonResponse(
        openApiRelationshipResponseSchema,
        OpenApiRouteDescription.RelationshipCreated
      ),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
      500: refResponse(OpenApiComponentResponse.ServerError),
    },
  })
}
