import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { registerStorytellerCatalogRoutes } from '@/domains/storyteller/core/io/openapi-routes-catalog'
import { registerStorytellerJobRoutes } from '@/domains/storyteller/core/io/openapi-routes-jobs'
import { registerStorytellerNarrativeRoutes } from '@/domains/storyteller/core/io/openapi-routes-narrative'

export function registerStorytellerPublicRoutes(registry: OpenAPIRegistry): void {
  registerStorytellerCatalogRoutes(registry)
  registerStorytellerNarrativeRoutes(registry)
  registerStorytellerJobRoutes(registry)
}
