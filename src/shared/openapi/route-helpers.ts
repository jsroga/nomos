import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'
import {
  OpenApiComponentResponse,
  OpenApiHttpMethod,
  OpenApiMediaType,
} from '@/shared/openapi/constants/openapi-wire'
import {
  refResponse,
  sessionOrApiKeySecurity,
} from '@/shared/openapi/shared-components'

type Security = NonNullable<RouteConfig['security']>
type ZodObjectSchema = z.ZodObject<z.ZodRawShape> | z.ZodEffects<z.ZodObject<z.ZodRawShape>>

export function jsonBody(schema: z.ZodType, required = true) {
  return {
    required,
    content: {
      [OpenApiMediaType.Json]: { schema },
    },
  }
}

export function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      [OpenApiMediaType.Json]: { schema },
    },
  }
}

export function authJsonErrors() {
  return {
    400: refResponse(OpenApiComponentResponse.BadRequest),
    401: refResponse(OpenApiComponentResponse.Unauthorized),
    403: refResponse(OpenApiComponentResponse.Forbidden),
    404: refResponse(OpenApiComponentResponse.NotFound),
    500: refResponse(OpenApiComponentResponse.ServerError),
  }
}

export type JsonRouteSpec = {
  method: OpenApiHttpMethod
  path: string
  tags: string[]
  summary: string
  description?: string
  security?: Security
  query?: ZodObjectSchema
  params?: ZodObjectSchema
  body?: z.ZodType
  successStatus: 200 | 201
  successSchema: z.ZodType
  successDescription: string
}

export function registerJsonRoute(registry: OpenAPIRegistry, spec: JsonRouteSpec): void {
  const request: RouteConfig['request'] = {}
  if (spec.query) request.query = spec.query
  if (spec.params) request.params = spec.params
  if (spec.body) request.body = jsonBody(spec.body)

  registry.registerPath({
    method: spec.method,
    path: spec.path,
    tags: spec.tags,
    summary: spec.summary,
    description: spec.description,
    security: spec.security ?? sessionOrApiKeySecurity,
    request: Object.keys(request).length > 0 ? request : undefined,
    responses: {
      [spec.successStatus]: jsonResponse(spec.successSchema, spec.successDescription),
      ...authJsonErrors(),
    },
  })
}
