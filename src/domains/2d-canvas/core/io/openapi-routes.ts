import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'
import {
  deleteTileRequestSchema,
  listTilesQuerySchema,
  tileListResponseSchema,
  tileResponseSchema,
  upsertTileRequestSchema,
} from '@/domains/2d-canvas/core/io/world.dto'
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
  openApiSuccessMessageSchema,
  refResponse,
  sessionOrApiKeySecurity,
} from '@/shared/openapi/shared-components'

ensureZodOpenApi()

const listTilesQuery = listTilesQuerySchema.openapi(OpenApiSchemaName.ListTilesQuery)
const upsertTileBody = upsertTileRequestSchema.openapi(OpenApiSchemaName.UpsertTileRequest)
const deleteTileBody = deleteTileRequestSchema.openapi(OpenApiSchemaName.DeleteTileRequest)
const tileListResponse = tileListResponseSchema.openapi(OpenApiSchemaName.TileListResponse)
const tileResponse = tileResponseSchema.openapi(OpenApiSchemaName.TileResponse)

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

export function registerWorldPublicRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.WorldTiles,
    tags: [OpenApiTag.World],
    summary: OpenApiRouteSummary.TilesList,
    security: sessionOrApiKeySecurity,
    request: { query: listTilesQuery },
    responses: {
      200: jsonResponse(tileListResponse, OpenApiRouteDescription.TileList),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.WorldTiles,
    tags: [OpenApiTag.World],
    summary: OpenApiRouteSummary.TilesUpsert,
    security: sessionOrApiKeySecurity,
    request: { body: jsonBody(upsertTileBody) },
    responses: {
      200: jsonResponse(tileResponse, OpenApiRouteDescription.TileUpserted),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Delete,
    path: OpenApiPath.WorldTiles,
    tags: [OpenApiTag.World],
    summary: OpenApiRouteSummary.TilesDelete,
    security: sessionOrApiKeySecurity,
    request: { body: jsonBody(deleteTileBody) },
    responses: {
      200: jsonResponse(openApiSuccessMessageSchema, OpenApiRouteDescription.TileDeleted),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })
}
