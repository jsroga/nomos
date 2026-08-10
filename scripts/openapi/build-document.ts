/**
 * Assembles the public OpenAPI document from shared + domain route registrars.
 * Script-only — may import domains; do not import this from src/shared or app routes.
 */
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi'
import { registerCanvas3dPublicRoutes } from '@/domains/3d-canvas/core/io/openapi-routes'
import { registerWorldPublicRoutes } from '@/domains/2d-canvas/core/io/openapi-routes'
import { registerStorytellerPublicRoutes } from '@/domains/storyteller/core/io/openapi-routes'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import {
  OpenApiDocInfo,
  OpenApiServerDescription,
  OpenApiServerUrl,
  OpenApiTag,
} from '@/shared/openapi/constants/openapi-wire'
import { registerSharedPublicRoutes } from '@/shared/openapi/register-shared-routes'
import { registerSharedComponents } from '@/shared/openapi/shared-components'

export type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>

export function buildPublicOpenApiDocument(): OpenApiDocument {
  ensureZodOpenApi()
  const registry = new OpenAPIRegistry()
  registerSharedComponents(registry)
  registerSharedPublicRoutes(registry)
  registerStorytellerPublicRoutes(registry)
  registerWorldPublicRoutes(registry)
  registerCanvas3dPublicRoutes(registry)

  const generator = new OpenApiGeneratorV3(registry.definitions)
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: OpenApiDocInfo.Title,
      version: OpenApiDocInfo.Version,
      description: OpenApiDocInfo.Description,
    },
    servers: [
      { url: OpenApiServerUrl.RelativeApi, description: OpenApiServerDescription.Relative },
      { url: OpenApiServerUrl.LocalhostApi, description: OpenApiServerDescription.Localhost },
    ],
    tags: [
      { name: OpenApiTag.Mcp },
      { name: OpenApiTag.ApiKeys },
      { name: OpenApiTag.Entities },
      { name: OpenApiTag.Storyteller },
      { name: OpenApiTag.World },
      { name: OpenApiTag.Canvas3d },
    ],
  })
}
