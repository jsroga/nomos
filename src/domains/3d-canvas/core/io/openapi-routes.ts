import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'
import {
  interiorTaskParamsSchema,
  interiorTextTo3DRequestSchema,
  interiorTextTo3DResponseSchema,
  interiorTextTo3DStatusResponseSchema,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
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

const textTo3dBody = interiorTextTo3DRequestSchema.openapi(
  OpenApiSchemaName.InteriorTextTo3DRequest
)
const textTo3dResponse = interiorTextTo3DResponseSchema.openapi(
  OpenApiSchemaName.InteriorTextTo3DResponse
)
const taskParams = interiorTaskParamsSchema.openapi(OpenApiSchemaName.InteriorTaskParams)
const textTo3dStatus = interiorTextTo3DStatusResponseSchema.openapi(
  OpenApiSchemaName.InteriorTextTo3DStatusResponse
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

export function registerCanvas3dPublicRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.Canvas3dTextTo3d,
    tags: [OpenApiTag.Canvas3d],
    summary: OpenApiRouteSummary.TextTo3dStart,
    security: sessionOrApiKeySecurity,
    request: { body: jsonBody(textTo3dBody) },
    responses: {
      200: jsonResponse(textTo3dResponse, OpenApiRouteDescription.TextTo3dStarted),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
    },
  })

  registry.registerPath({
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.Canvas3dTextTo3dTask,
    tags: [OpenApiTag.Canvas3d],
    summary: OpenApiRouteSummary.TextTo3dPoll,
    security: sessionOrApiKeySecurity,
    request: { params: taskParams },
    responses: {
      200: jsonResponse(textTo3dStatus, OpenApiRouteDescription.TextTo3dStatus),
      400: refResponse(OpenApiComponentResponse.BadRequest),
      401: refResponse(OpenApiComponentResponse.Unauthorized),
      404: refResponse(OpenApiComponentResponse.NotFound),
    },
  })
}
