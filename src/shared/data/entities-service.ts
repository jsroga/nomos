/**
 * Entities Service
 *
 * Shared business logic for game entities operations.
 * Used by both REST API and MCP server.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import { z } from 'zod'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  EntitiesServiceErrorCode,
  EntitiesServiceErrorName,
  EntitiesServiceLog,
} from '@/shared/data/constants/entities-service'
import { ApiErrorMessage, AppModuleId, GameEntityKind } from '@/shared/data/constants/protocol'

// ============================================
// SCHEMAS
// ============================================

export const entityTypeSchema = z.enum([
  GameEntityKind.Character,
  GameEntityKind.Location,
  GameEntityKind.Mechanic,
  GameEntityKind.Faction,
  GameEntityKind.Item,
  GameEntityKind.Quest,
])

export const sourceDomainSchema = z.enum([
  AppModuleId.Storyteller,
  AppModuleId.LoopCreator,
  AppModuleId.InteriorDesigner,
  AppModuleId.WorldBuilding,
])

export const listEntitiesSchema = z.object({
  projectId: z.string().uuid(),
  entityType: entityTypeSchema.optional(),
  sourceDomain: sourceDomainSchema.optional(),
  search: z.string().optional(),
})

export const createEntitySchema = z.object({
  projectId: z.string().uuid(),
  entityType: entityTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  sourceDomain: sourceDomainSchema,
  sourceEntityId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
})

export const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  usedInDomains: z.array(sourceDomainSchema).optional(),
})

// ============================================
// TYPES
// ============================================

export type ListEntitiesInput = z.infer<typeof listEntitiesSchema>
export type CreateEntityInput = z.infer<typeof createEntitySchema>
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>

export interface GameEntity {
  id: string
  project_id: string
  user_id: string
  entity_type: string
  name: string
  description: string | null
  source_domain: string
  source_entity_id: string | null
  metadata: Record<string, unknown>
  tags: string[]
  image_url: string | null
  used_in_domains: string[]
  created_at: string
  updated_at: string
}

export interface ServiceContext {
  userId: string
  supabase: SupabaseClient
}

// ============================================
// SERVICE CLASS
// ============================================

export class EntitiesService {
  /**
   * List entities for a project with optional filtering
   */
  async list(
    input: ListEntitiesInput,
    context: ServiceContext
  ): Promise<{ entities: GameEntity[] }> {
    const validated = listEntitiesSchema.parse(input)

    // Ownership is application-level: this reads through Drizzle-backed state
    // where RLS does not apply. See docs/decisions/0001-data-access-and-rls.md.
    const hasAccess = await verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        ApiErrorMessage.PROJECT_NOT_FOUND,
        EntitiesServiceErrorCode.NotFound
      )
    }

    let query = context.supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .select('*')
      .eq(DB_COLUMN.PROJECT_ID, validated.projectId)
      .order(DB_COLUMN.CREATED_AT, { ascending: false })

    if (validated.entityType) {
      query = query.eq(DB_COLUMN.ENTITY_TYPE, validated.entityType)
    }

    if (validated.sourceDomain) {
      query = query.eq(DB_COLUMN.SOURCE_DOMAIN, validated.sourceDomain)
    }

    if (validated.search) {
      query = query.or(`name.ilike.%${validated.search}%,description.ilike.%${validated.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error(EntitiesServiceLog.FetchError, error)
      throw new ServiceError(
        API_ERROR.FAILED_FETCH_ENTITIES,
        EntitiesServiceErrorCode.InternalError
      )
    }

    return { entities: data || [] }
  }

  /**
   * Get a single entity by ID
   */
  async get(entityId: string, context: ServiceContext): Promise<{ entity: GameEntity }> {
    const { data, error } = await context.supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .select('*')
      .eq(DB_COLUMN.ID, entityId)
      .single()

    if (error || !data) {
      throw new ServiceError(API_ERROR.ENTITY_NOT_FOUND, EntitiesServiceErrorCode.NotFound)
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(data.project_id, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        API_ERROR.ENTITY_ACCESS_DENIED,
        EntitiesServiceErrorCode.NotFound
      )
    }

    return { entity: data }
  }

  /**
   * Create a new entity
   */
  async create(input: CreateEntityInput, context: ServiceContext): Promise<{ entity: GameEntity }> {
    const validated = createEntitySchema.parse(input)

    // Ownership is application-level: this reads through Drizzle-backed state
    // where RLS does not apply. See docs/decisions/0001-data-access-and-rls.md.
    const hasAccess = await verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        ApiErrorMessage.PROJECT_NOT_FOUND,
        EntitiesServiceErrorCode.NotFound
      )
    }

    const { data, error } = await context.supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .insert({
        project_id: validated.projectId,
        user_id: context.userId,
        entity_type: validated.entityType,
        name: validated.name,
        description: validated.description,
        source_domain: validated.sourceDomain,
        source_entity_id: validated.sourceEntityId,
        metadata: validated.metadata || {},
        tags: validated.tags || [],
        image_url: validated.imageUrl,
        used_in_domains: [validated.sourceDomain],
      })
      .select()
      .single()

    if (error) {
      console.error(EntitiesServiceLog.CreateError, error)
      throw new ServiceError(
        API_ERROR.FAILED_CREATE_ENTITY,
        EntitiesServiceErrorCode.InternalError
      )
    }

    return { entity: data }
  }

  /**
   * Update an existing entity
   */
  async update(
    entityId: string,
    input: UpdateEntityInput,
    context: ServiceContext
  ): Promise<{ entity: GameEntity }> {
    const validated = updateEntitySchema.parse(input)

    // First verify the entity exists and user has access
    await this.get(entityId, context)

    const updateData: Record<string, unknown> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.metadata !== undefined) updateData.metadata = validated.metadata
    if (validated.tags !== undefined) updateData.tags = validated.tags
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl
    if (validated.usedInDomains !== undefined) updateData.used_in_domains = validated.usedInDomains

    const { data, error } = await context.supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .update(updateData)
      .eq(DB_COLUMN.ID, entityId)
      .select()
      .single()

    if (error) {
      console.error(EntitiesServiceLog.UpdateError, error)
      throw new ServiceError(
        API_ERROR.FAILED_UPDATE_ENTITY,
        EntitiesServiceErrorCode.InternalError
      )
    }

    return { entity: data }
  }

  /**
   * Delete an entity
   */
  async delete(entityId: string, context: ServiceContext): Promise<{ success: boolean }> {
    // First verify the entity exists and user has access
    await this.get(entityId, context)

    const { error } = await context.supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .delete()
      .eq(DB_COLUMN.ID, entityId)

    if (error) {
      console.error(EntitiesServiceLog.DeleteError, error)
      throw new ServiceError(
        API_ERROR.FAILED_DELETE_ENTITY,
        EntitiesServiceErrorCode.InternalError
      )
    }

    return { success: true }
  }

  /**
   * Verify project access via RLS
   */
}

// ============================================
// ERROR HANDLING
// ============================================

export type ServiceErrorCode = `${EntitiesServiceErrorCode}`

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = EntitiesServiceErrorName.ServiceError
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const entitiesService = new EntitiesService()
