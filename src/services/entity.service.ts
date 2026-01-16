/**
 * Entity Service - Core business logic for game entities
 *
 * This service is stateless and can be used by both REST API and MCP.
 * It handles CRUD operations for game entities and their relationships.
 */

import { db } from '@/db'
import { gameEntities, entityRelationships, projects } from '@/db/schema'
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm'
import {
  ListEntitiesInput,
  GetEntityInput,
  CreateEntityInput,
  UpdateEntityInput,
  DeleteEntityInput,
  ListRelationshipsInput,
  CreateRelationshipInput,
  DeleteRelationshipInput,
  Entity,
  EntityRelationship,
  ListEntitiesOutput,
  ListRelationshipsOutput,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from './types'

type DbClient = typeof db

/**
 * Transform database row to Entity type
 */
function toEntity(row: typeof gameEntities.$inferSelect): Entity {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    entityType: row.entityType as Entity['entityType'],
    name: row.name,
    description: row.description,
    sourceDomain: row.sourceDomain as Entity['sourceDomain'],
    sourceEntityId: row.sourceEntityId,
    usedInDomains: row.usedInDomains || [],
    metadata: (row.metadata as Record<string, unknown>) || {},
    tags: row.tags || [],
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Transform database row to EntityRelationship type
 */
function toRelationship(row: any): EntityRelationship {
  return {
    id: row.id,
    projectId: row.projectId,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    relationshipType: row.relationshipType as EntityRelationship['relationshipType'],
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    fromEntity: row.fromEntity ? toEntity(row.fromEntity) : undefined,
    toEntity: row.toEntity ? toEntity(row.toEntity) : undefined,
  }
}

export class EntityService {
  constructor(private dbClient: DbClient = db) {}

  /**
   * Verify user has access to a project
   */
  async verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const result = await this.dbClient
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    return result.length > 0
  }

  /**
   * List entities for a project with optional filtering
   */
  async listEntities(input: ListEntitiesInput, userId: string): Promise<ListEntitiesOutput> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    // Build where conditions
    const conditions = [eq(gameEntities.projectId, input.projectId)]

    if (input.entityType) {
      conditions.push(eq(gameEntities.entityType, input.entityType))
    }

    if (input.sourceDomain) {
      conditions.push(eq(gameEntities.sourceDomain, input.sourceDomain))
    }

    if (input.search) {
      conditions.push(
        or(
          ilike(gameEntities.name, `%${input.search}%`),
          ilike(gameEntities.description, `%${input.search}%`)
        )!
      )
    }

    // Get entities
    const rows = await this.dbClient
      .select()
      .from(gameEntities)
      .where(and(...conditions))
      .orderBy(desc(gameEntities.createdAt))
      .limit(input.limit || 50)
      .offset(input.offset || 0)

    // Get total count
    const countResult = await this.dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(gameEntities)
      .where(and(...conditions))

    return {
      entities: rows.map(toEntity),
      total: countResult[0]?.count || 0,
    }
  }

  /**
   * Get a single entity by ID
   */
  async getEntity(input: GetEntityInput, userId: string): Promise<Entity> {
    const rows = await this.dbClient
      .select()
      .from(gameEntities)
      .where(eq(gameEntities.id, input.entityId))
      .limit(1)

    if (rows.length === 0) {
      throw new NotFoundError('Entity', input.entityId)
    }

    const entity = rows[0]

    // Verify project access
    const hasAccess = await this.verifyProjectAccess(entity.projectId, userId)
    if (!hasAccess) {
      throw new NotFoundError('Entity', input.entityId)
    }

    return toEntity(entity)
  }

  /**
   * Create a new entity
   */
  async createEntity(input: CreateEntityInput): Promise<Entity> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, input.userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    const [row] = await this.dbClient
      .insert(gameEntities)
      .values({
        projectId: input.projectId,
        userId: input.userId,
        entityType: input.entityType,
        name: input.name,
        description: input.description,
        sourceDomain: input.sourceDomain,
        sourceEntityId: input.sourceEntityId,
        metadata: input.metadata || {},
        tags: input.tags || [],
        imageUrl: input.imageUrl,
        usedInDomains: [input.sourceDomain],
      })
      .returning()

    return toEntity(row)
  }

  /**
   * Update an entity
   */
  async updateEntity(input: UpdateEntityInput, userId: string): Promise<Entity> {
    // First verify the entity exists and user has access
    const existing = await this.getEntity({ entityId: input.entityId }, userId)

    // Build updates object
    const updates: Partial<typeof gameEntities.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.metadata !== undefined) updates.metadata = input.metadata
    if (input.tags !== undefined) updates.tags = input.tags
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl
    if (input.usedInDomains !== undefined) updates.usedInDomains = input.usedInDomains

    const [row] = await this.dbClient
      .update(gameEntities)
      .set(updates)
      .where(eq(gameEntities.id, input.entityId))
      .returning()

    if (!row) {
      throw new NotFoundError('Entity', input.entityId)
    }

    return toEntity(row)
  }

  /**
   * Delete an entity
   */
  async deleteEntity(input: DeleteEntityInput, userId: string): Promise<void> {
    // First verify the entity exists and user has access
    await this.getEntity({ entityId: input.entityId }, userId)

    await this.dbClient.delete(gameEntities).where(eq(gameEntities.id, input.entityId))
  }

  /**
   * List relationships for an entity
   */
  async listRelationships(
    input: ListRelationshipsInput,
    userId: string
  ): Promise<ListRelationshipsOutput> {
    // If projectId provided, verify access
    if (input.projectId) {
      const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Project not found or access denied')
      }
    }

    // Build where conditions
    const entityCondition = or(
      eq(entityRelationships.fromEntityId, input.entityId),
      eq(entityRelationships.toEntityId, input.entityId)
    )

    const conditions = input.projectId
      ? and(entityCondition, eq(entityRelationships.projectId, input.projectId))
      : entityCondition

    // Query with joined entities
    const rows = await this.dbClient.query.entityRelationships.findMany({
      where: conditions,
      with: {
        fromEntity: true,
        toEntity: true,
      },
    })

    return {
      relationships: rows.map(toRelationship),
    }
  }

  /**
   * Create a relationship between entities
   */
  async createRelationship(
    input: CreateRelationshipInput,
    userId: string
  ): Promise<EntityRelationship> {
    // Prevent self-relationships
    if (input.fromEntityId === input.toEntityId) {
      throw new ValidationError('Cannot create relationship from entity to itself')
    }

    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    // Verify both entities exist and belong to the project
    const [fromEntity, toEntity] = await Promise.all([
      this.getEntity({ entityId: input.fromEntityId }, userId),
      this.getEntity({ entityId: input.toEntityId }, userId),
    ])

    if (fromEntity.projectId !== input.projectId || toEntity.projectId !== input.projectId) {
      throw new ValidationError('Both entities must belong to the same project')
    }

    const [row] = await this.dbClient
      .insert(entityRelationships)
      .values({
        projectId: input.projectId,
        fromEntityId: input.fromEntityId,
        toEntityId: input.toEntityId,
        relationshipType: input.relationshipType,
        metadata: input.metadata || {},
      })
      .returning()

    // Fetch with related entities
    const result = await this.dbClient.query.entityRelationships.findFirst({
      where: eq(entityRelationships.id, row.id),
      with: {
        fromEntity: true,
        toEntity: true,
      },
    })

    return toRelationship(result)
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(input: DeleteRelationshipInput, userId: string): Promise<void> {
    // First get the relationship to verify access
    const relationship = await this.dbClient.query.entityRelationships.findFirst({
      where: eq(entityRelationships.id, input.relationshipId),
    })

    if (!relationship) {
      throw new NotFoundError('Relationship', input.relationshipId)
    }

    // Verify project access
    const hasAccess = await this.verifyProjectAccess(relationship.projectId, userId)
    if (!hasAccess) {
      throw new NotFoundError('Relationship', input.relationshipId)
    }

    await this.dbClient
      .delete(entityRelationships)
      .where(eq(entityRelationships.id, input.relationshipId))
  }
}

// Export singleton instance for convenience
export const entityService = new EntityService()

