import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import {
  OpenApiBearerFormat,
  OpenApiComponentDescription,
  OpenApiComponentKind,
  OpenApiComponentResponse,
  OpenApiCookieName,
  OpenApiHttpAuthScheme,
  OpenApiMediaType,
  OpenApiRefPrefix,
  OpenApiSchemaName,
  OpenApiSecuritySchemeIn,
  OpenApiSecuritySchemeName,
  OpenApiSecuritySchemeType,
} from '@/shared/openapi/constants/openapi-wire'

ensureZodOpenApi()

export const openApiErrorBodySchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  })
  .openapi(OpenApiSchemaName.ErrorBody)

export const openApiSuccessMessageSchema = z
  .object({
    success: z.boolean(),
    message: z.string().optional(),
  })
  .openapi(OpenApiSchemaName.SuccessMessage)

function schemaRef(name: OpenApiSchemaName): { $ref: string } {
  return { $ref: `${OpenApiRefPrefix.Schemas}${name}` }
}

export function registerSharedComponents(registry: OpenAPIRegistry): void {
  registry.register(OpenApiSchemaName.ErrorBody, openApiErrorBodySchema)
  registry.register(OpenApiSchemaName.SuccessMessage, openApiSuccessMessageSchema)

  registry.registerComponent(OpenApiComponentKind.SecuritySchemes, OpenApiSecuritySchemeName.BearerApiKey, {
    type: OpenApiSecuritySchemeType.Http,
    scheme: OpenApiHttpAuthScheme.Bearer,
    bearerFormat: OpenApiBearerFormat.ApiKey,
    description: OpenApiComponentDescription.BearerApiKey,
  })

  registry.registerComponent(OpenApiComponentKind.SecuritySchemes, OpenApiSecuritySchemeName.SessionCookie, {
    type: OpenApiSecuritySchemeType.ApiKey,
    in: OpenApiSecuritySchemeIn.Cookie,
    name: OpenApiCookieName.SupabaseAccessToken,
    description: OpenApiComponentDescription.SessionCookie,
  })

  registry.registerComponent(OpenApiComponentKind.Responses, OpenApiComponentResponse.BadRequest, {
    description: OpenApiComponentDescription.BadRequest,
    content: {
      [OpenApiMediaType.Json]: {
        schema: schemaRef(OpenApiSchemaName.ErrorBody),
      },
    },
  })

  registry.registerComponent(OpenApiComponentKind.Responses, OpenApiComponentResponse.Unauthorized, {
    description: OpenApiComponentDescription.Unauthorized,
    content: {
      [OpenApiMediaType.Json]: {
        schema: schemaRef(OpenApiSchemaName.ErrorBody),
      },
    },
  })

  registry.registerComponent(OpenApiComponentKind.Responses, OpenApiComponentResponse.Forbidden, {
    description: OpenApiComponentDescription.Forbidden,
    content: {
      [OpenApiMediaType.Json]: {
        schema: schemaRef(OpenApiSchemaName.ErrorBody),
      },
    },
  })

  registry.registerComponent(OpenApiComponentKind.Responses, OpenApiComponentResponse.NotFound, {
    description: OpenApiComponentDescription.NotFound,
    content: {
      [OpenApiMediaType.Json]: {
        schema: schemaRef(OpenApiSchemaName.ErrorBody),
      },
    },
  })

  registry.registerComponent(OpenApiComponentKind.Responses, OpenApiComponentResponse.ServerError, {
    description: OpenApiComponentDescription.ServerError,
    content: {
      [OpenApiMediaType.Json]: {
        schema: schemaRef(OpenApiSchemaName.ErrorBody),
      },
    },
  })
}

export function refResponse(name: OpenApiComponentResponse): { $ref: string } {
  return { $ref: `${OpenApiRefPrefix.Responses}${name}` }
}

type Security = NonNullable<RouteConfig['security']>

export const sessionOrApiKeySecurity: Security = [
  { [OpenApiSecuritySchemeName.SessionCookie]: [] },
  { [OpenApiSecuritySchemeName.BearerApiKey]: [] },
]

export const apiKeySecurity: Security = [{ [OpenApiSecuritySchemeName.BearerApiKey]: [] }]

export const sessionSecurity: Security = [{ [OpenApiSecuritySchemeName.SessionCookie]: [] }]
