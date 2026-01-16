/**
 * Entities Service
 *
 * Shared business logic for game entities operations.
 * Used by both REST API and MCP server.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

export const entityTypeSchema = z.enum([
  'character',
  'location',
  'mechanic',
  'faction',
  'item',
  'quest',
])

export const sourceDomainSchema = z.enum([
  'storyteller',
  'loop-creator',
  'interior-designer',
  'world-building',
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
  metadata: Record<string, any>
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

    // Verify project access via RLS
    const hasAccess = await this.verifyProjectAccess(context.supabase, validated.projectId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    let query = context.supabase
      .from('game_entities')
      .select('*')
      .eq('project_id', validated.projectId)
      .order('created_at', { ascending: false })

    if (validated.entityType) {
      query = query.eq('entity_type', validated.entityType)
    }

    if (validated.sourceDomain) {
      query = query.eq('source_domain', validated.sourceDomain)
    }

    if (validated.search) {
      query = query.or(
        `name.ilike.%${validated.search}%,description.ilike.%${validated.search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('[EntitiesService] Error fetching entities:', error)
      throw new ServiceError('Failed to fetch entities', 'INTERNAL_ERROR')
    }

    return { entities: data || [] }
  }

  /**
   * Get a single entity by ID
   */
  async get(
    entityId: string,
    context: ServiceContext
  ): Promise<{ entity: GameEntity }> {
    const { data, error } = await context.supabase
      .from('game_entities')
      .select('*')
      .eq('id', entityId)
      .single()

    if (error || !data) {
      throw new ServiceError('Entity not found', 'NOT_FOUND')
    }

    // Verify project access
    const hasAccess = await this.verifyProjectAccess(context.supabase, data.project_id)
    if (!hasAccess) {
      throw new ServiceError('Entity not found or access denied', 'NOT_FOUND')
    }

    return { entity: data }
  }

  /**
   * Create a new entity
   */
  async create(
    input: CreateEntityInput,
    context: ServiceContext
  ): Promise<{ entity: GameEntity }> {
    const validated = createEntitySchema.parse(input)

    // Verify project access via RLS
    const hasAccess = await this.verifyProjectAccess(context.supabase, validated.projectId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    const { data, error } = await context.supabase
      .from('game_entities')
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
      console.error('[EntitiesService] Error creating entity:', error)
      throw new ServiceError('Failed to create entity', 'INTERNAL_ERROR')
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

    const updateData: Record<string, any> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.metadata !== undefined) updateData.metadata = validated.metadata
    if (validated.tags !== undefined) updateData.tags = validated.tags
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl
    if (validated.usedInDomains !== undefined) updateData.used_in_domains = validated.usedInDomains

    const { data, error } = await context.supabase
      .from('game_entities')
      .update(updateData)
      .eq('id', entityId)
      .select()
      .single()

    if (error) {
      console.error('[EntitiesService] Error updating entity:', error)
      throw new ServiceError('Failed to update entity', 'INTERNAL_ERROR')
    }

    return { entity: data }
  }

  /**
   * Delete an entity
   */
  async delete(entityId: string, context: ServiceContext): Promise<{ success: boolean }> {
    // First verify the entity exists and user has access
    await this.get(entityId, context)

    const { error } = await context.supabase.from('game_entities').delete().eq('id', entityId)

    if (error) {
      console.error('[EntitiesService] Error deleting entity:', error)
      throw new ServiceError('Failed to delete entity', 'INTERNAL_ERROR')
    }

    return { success: true }
  }

  /**
   * Verify project access via RLS
   */
  private async verifyProjectAccess(
    supabase: SupabaseClient,
    projectId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    return !error && !!data
  }
}

// ============================================
// ERROR HANDLING
// ============================================

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const entitiesService = new EntitiesService()

