import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { describe, expect, it } from 'vitest'
import { registerStorytellerPublicRoutes } from '../openapi-routes'
import { OpenApiStorytellerPath } from '../constants/openapi-storyteller-wire'
import { registerSharedComponents } from '@/shared/openapi/shared-components'
import { OpenApiDocInfo } from '@/shared/openapi/constants/openapi-wire'

describe('storyteller OpenAPI registry', () => {
  it('documents characters, projects, beats, and jobs — not only episodes', () => {
    const registry = new OpenAPIRegistry()
    registerSharedComponents(registry)
    registerStorytellerPublicRoutes(registry)
    const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
      openapi: '3.0.3',
      info: { title: OpenApiDocInfo.Title, version: OpenApiDocInfo.Version },
    })
    const paths = Object.keys(document.paths ?? {})
    expect(paths).toEqual(
      expect.arrayContaining([
        OpenApiStorytellerPath.Projects,
        OpenApiStorytellerPath.Characters,
        OpenApiStorytellerPath.EpisodeBeats,
        OpenApiStorytellerPath.GeneratePortrait,
        OpenApiStorytellerPath.ConsistencyCheck,
      ]),
    )
    const characterGet = document.paths?.[OpenApiStorytellerPath.Characters]?.get
    expect(characterGet?.parameters?.length).toBeGreaterThan(0)
    const characterPost = document.paths?.[OpenApiStorytellerPath.Characters]?.post
    expect(characterPost?.requestBody).toBeTruthy()
  })
})
