import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  OpenApiStorytellerDescription,
  OpenApiStorytellerPath,
  OpenApiStorytellerSummary,
} from '@/domains/storyteller/core/io/constants/openapi-storyteller-wire'
import {
  openApiSuccessMessageSchema,
  stCharacter,
  stCharacterIdParams,
  stCharacterIdQuery,
  stCharacterList,
  stCreateCharacterRequest,
  stCreateProjectRequest,
  stPatchCharacterRequest,
  stPatchProjectRequest,
  stProject,
  stProjectIdParams,
  stProjectIdQuery,
  stProjectList,
  stRelationshipGraph,
  stBibleResponse,
} from '@/domains/storyteller/core/io/openapi-schemas'
import { OpenApiHttpMethod, OpenApiTag } from '@/shared/openapi/constants/openapi-wire'
import { registerJsonRoute } from '@/shared/openapi/route-helpers'

const tags = [OpenApiTag.Storyteller]

export function registerStorytellerCatalogRoutes(registry: OpenAPIRegistry): void {
  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Projects,
    tags,
    summary: OpenApiStorytellerSummary.ProjectsList,
    successStatus: 200,
    successSchema: stProjectList,
    successDescription: OpenApiStorytellerDescription.ProjectList,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.Projects,
    tags,
    summary: OpenApiStorytellerSummary.ProjectsCreate,
    body: stCreateProjectRequest,
    successStatus: 200,
    successSchema: stProject,
    successDescription: OpenApiStorytellerDescription.ProjectCreated,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.ProjectById,
    tags,
    summary: OpenApiStorytellerSummary.ProjectsGet,
    params: stProjectIdParams,
    successStatus: 200,
    successSchema: stProject,
    successDescription: OpenApiStorytellerDescription.Project,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.ProjectById,
    tags,
    summary: OpenApiStorytellerSummary.ProjectsPatch,
    params: stProjectIdParams,
    body: stPatchProjectRequest,
    successStatus: 200,
    successSchema: stProject,
    successDescription: OpenApiStorytellerDescription.Project,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Characters,
    tags,
    summary: OpenApiStorytellerSummary.CharactersList,
    query: stProjectIdQuery,
    successStatus: 200,
    successSchema: stCharacterList,
    successDescription: OpenApiStorytellerDescription.CharacterList,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.Characters,
    tags,
    summary: OpenApiStorytellerSummary.CharactersCreate,
    body: stCreateCharacterRequest,
    successStatus: 200,
    successSchema: stCharacter,
    successDescription: OpenApiStorytellerDescription.Character,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.Characters,
    tags,
    summary: OpenApiStorytellerSummary.CharactersPatch,
    body: stPatchCharacterRequest,
    successStatus: 200,
    successSchema: stCharacter,
    successDescription: OpenApiStorytellerDescription.Character,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Delete,
    path: OpenApiStorytellerPath.Characters,
    tags,
    summary: OpenApiStorytellerSummary.CharactersDelete,
    query: stCharacterIdQuery,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.Deleted,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.CharacterById,
    tags,
    summary: OpenApiStorytellerSummary.CharactersPatchById,
    params: stCharacterIdParams,
    body: stPatchCharacterRequest,
    successStatus: 200,
    successSchema: stCharacter,
    successDescription: OpenApiStorytellerDescription.Character,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Bible,
    tags,
    summary: OpenApiStorytellerSummary.BibleGet,
    query: stProjectIdQuery,
    successStatus: 200,
    successSchema: stBibleResponse,
    successDescription: OpenApiStorytellerDescription.Bible,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Relationships,
    tags,
    summary: OpenApiStorytellerSummary.RelationshipsGet,
    query: stProjectIdQuery,
    successStatus: 200,
    successSchema: stRelationshipGraph,
    successDescription: OpenApiStorytellerDescription.RelationshipGraph,
  })
}
