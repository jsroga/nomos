import { z } from 'zod'
import {
  createEntitySchema,
  listEntitiesSchema,
  updateEntitySchema,
  entityTypeSchema,
  sourceDomainSchema,
} from '@/shared/data/entities-service'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import {
  EntityRelationshipType,
  OpenApiSchemaName,
} from '@/shared/openapi/constants/openapi-wire'

ensureZodOpenApi()

export const openApiListEntitiesQuerySchema = listEntitiesSchema.openapi(
  OpenApiSchemaName.ListEntitiesQuery
)

export const openApiCreateEntityRequestSchema = createEntitySchema
  .omit({ metadata: true })
  .extend({
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi(OpenApiSchemaName.CreateEntityRequest)

export const openApiUpdateEntityRequestSchema = updateEntitySchema
  .omit({ metadata: true })
  .extend({
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi(OpenApiSchemaName.UpdateEntityRequest)

export const openApiGameEntitySchema = z
  .object({
    id: z.string().uuid(),
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
    entity_type: entityTypeSchema,
    name: z.string(),
    description: z.string().nullable(),
    source_domain: sourceDomainSchema,
    source_entity_id: z.string().uuid().nullable(),
    metadata: z.record(z.unknown()),
    tags: z.array(z.string()),
    image_url: z.string().nullable(),
    used_in_domains: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough()
  .openapi(OpenApiSchemaName.GameEntity)

export const openApiEntitiesListResponseSchema = z
  .object({
    entities: z.array(openApiGameEntitySchema),
  })
  .openapi(OpenApiSchemaName.EntitiesListResponse)

export const openApiEntityResponseSchema = z
  .object({
    entity: openApiGameEntitySchema,
  })
  .openapi(OpenApiSchemaName.EntityResponse)

export const openApiEntityIdParamsSchema = z
  .object({
    entityId: z.string().uuid(),
  })
  .openapi(OpenApiSchemaName.EntityIdParams)

export const openApiListRelationshipsQuerySchema = z
  .object({
    entityId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
  })
  .openapi(OpenApiSchemaName.ListRelationshipsQuery)

export const openApiCreateRelationshipRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    fromEntityId: z.string().uuid(),
    toEntityId: z.string().uuid(),
    relationshipType: z.nativeEnum(EntityRelationshipType),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi(OpenApiSchemaName.CreateRelationshipRequest)

export const openApiEntityRelationshipSchema = z
  .object({
    id: z.string().uuid(),
    project_id: z.string().uuid(),
    from_entity_id: z.string().uuid(),
    to_entity_id: z.string().uuid(),
    relationship_type: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .openapi(OpenApiSchemaName.EntityRelationship)

export const openApiRelationshipsListResponseSchema = z
  .object({
    relationships: z.array(openApiEntityRelationshipSchema),
  })
  .openapi(OpenApiSchemaName.RelationshipsListResponse)

export const openApiRelationshipResponseSchema = z
  .object({
    relationship: openApiEntityRelationshipSchema,
  })
  .openapi(OpenApiSchemaName.RelationshipResponse)
