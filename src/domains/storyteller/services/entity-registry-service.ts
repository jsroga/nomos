/**
 * Entity Registry Service (SERVER-ONLY)
 */

import { entityReferences } from '@/db'
import { db } from '@/db/client'
import { eq, and, inArray } from 'drizzle-orm'
import {
  parseEntityType,
  entityMetadata,
} from '@/domains/storyteller/core/entities/entity-type-guards'
import {
  EntityRegistryLog,
  EntityRegistryNote,
} from '@/domains/storyteller/services/constants/entity-registry-log'
import { LRUCache } from './entity-registry-lru-cache'
import { generateEntityEmbedding } from './entity-registry-embedding'
import {
  generateReferenceId,
  getEntityTypeFromId,
  REFERENCE_PATTERN,
  ENTITY_PREFIXES,
  PREFIX_TO_TYPE,
  type EntityType,
} from './entity-registry-reference-id'

export { ENTITY_PREFIXES, PREFIX_TO_TYPE, REFERENCE_PATTERN, getEntityTypeFromId, generateReferenceId }
export type { EntityType }

export interface EntityReference {
  id: string
  type: EntityType
  name: string
  description: string
  metadata: Record<string, unknown>
  projectId: string
  sourceEntityId?: string
  createdAt: Date
  lastReferencedAt: Date
}

export interface RegisterEntityInput {
  type: EntityType
  name: string
  description: string
  metadata?: Record<string, unknown>
  projectId: string
  sourceEntityId?: string
}

class EntityRegistryService {
  private cache = new LRUCache<string, EntityReference>(1000)
  private projectCaches = new Map<string, Set<string>>()

  async register(input: RegisterEntityInput): Promise<string> {
    const refId = generateReferenceId(input.type)
    const now = new Date()

    const entity: EntityReference = {
      id: refId,
      type: input.type,
      name: input.name,
      description: input.description,
      metadata: input.metadata || {},
      projectId: input.projectId,
      sourceEntityId: input.sourceEntityId,
      createdAt: now,
      lastReferencedAt: now,
    }

    this.cacheEntity(entity, input.projectId)
    this.persistEntity(entity).catch(err => {
      console.warn(EntityRegistryLog.PersistFailed, err)
    })

    return refId
  }

  async registerWithId(refId: string, input: Omit<RegisterEntityInput, 'type'>): Promise<string> {
    const type = getEntityTypeFromId(refId)
    if (!type) {
      throw new Error(`Invalid refId format: ${refId}`)
    }

    const now = new Date()
    const entity: EntityReference = {
      id: refId,
      type,
      name: input.name,
      description: input.description,
      metadata: input.metadata || {},
      projectId: input.projectId,
      sourceEntityId: input.sourceEntityId,
      createdAt: now,
      lastReferencedAt: now,
    }

    this.cacheEntity(entity, input.projectId)
    this.persistEntity(entity).catch(err => {
      console.warn(EntityRegistryLog.PersistFailed, err)
    })

    console.log(`[EntityRegistry] Registered entity with explicit ID: ${refId}`)
    return refId
  }

  async registerIfNotExists(input: RegisterEntityInput): Promise<string> {
    const existing = await this.findByNameAndType(input.projectId, input.name, input.type)
    if (existing) return existing.id
    return this.register(input)
  }

  async findByNameAndType(
    projectId: string,
    name: string,
    type: EntityType
  ): Promise<EntityReference | null> {
    const projectRefs = this.projectCaches.get(projectId)
    if (projectRefs) {
      for (const refId of projectRefs) {
        const entity = this.cache.get(refId)
        if (entity && entity.name.toLowerCase() === name.toLowerCase() && entity.type === type) {
          return entity
        }
      }
    }

    try {
      const [dbEntity] = await db
        .select()
        .from(entityReferences)
        .where(
          and(
            eq(entityReferences.projectId, projectId),
            eq(entityReferences.name, name),
            eq(entityReferences.type, type)
          )
        )
        .limit(1)

      if (dbEntity) {
        const entity = this.dbToEntity(dbEntity)
        if (entity) {
          this.cache.set(entity.id, entity)
          return entity
        }
      }
    } catch (err) {
      console.warn(EntityRegistryLog.DbLookupFailed, err)
    }

    return null
  }

  async resolve(refId: string): Promise<EntityReference | null> {
    const cached = this.cache.get(refId)
    if (cached) return cached

    try {
      const [dbEntity] = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.id, refId))
        .limit(1)

      if (dbEntity) {
        const entity = this.dbToEntity(dbEntity)
        if (entity) {
          this.cache.set(refId, entity)
          return entity
        }
      }
    } catch (err) {
      console.warn(EntityRegistryLog.ResolveFailed, err)
    }

    return null
  }

  async resolveMany(refIds: string[]): Promise<Map<string, EntityReference>> {
    const result = new Map<string, EntityReference>()
    const missingIds: string[] = []

    for (const refId of refIds) {
      const cached = this.cache.get(refId)
      if (cached) {
        result.set(refId, cached)
      } else {
        missingIds.push(refId)
      }
    }

    if (missingIds.length > 0) {
      try {
        const dbEntities = await db
          .select()
          .from(entityReferences)
          .where(inArray(entityReferences.id, missingIds))

        for (const dbEntity of dbEntities) {
          const entity = this.dbToEntity(dbEntity)
          if (!entity) continue
          this.cache.set(entity.id, entity)
          result.set(entity.id, entity)
        }
      } catch (err) {
        console.warn(EntityRegistryLog.ResolveEntitiesFailed, err)
      }
    }

    return result
  }

  extractReferences(text: string): string[] {
    return [...new Set(this.extractReferencesWithNames(text).map(r => r.refId))]
  }

  extractReferencesWithNames(text: string): Array<{ name: string; refId: string }> {
    const refs: Array<{ name: string; refId: string }> = []
    const pattern = new RegExp(REFERENCE_PATTERN.source, 'g')
    let match

    while ((match = pattern.exec(text)) !== null) {
      refs.push({ name: match[1], refId: match[2] })
    }

    return refs
  }

  async getProjectEntities(projectId: string): Promise<EntityReference[]> {
    try {
      const dbEntities = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.projectId, projectId))

      const entities = dbEntities
        .map(e => this.dbToEntity(e))
        .filter((entity): entity is EntityReference => entity !== null)

      for (const entity of entities) {
        this.cacheEntity(entity, projectId)
      }

      return entities
    } catch (err) {
      console.warn(EntityRegistryLog.ProjectEntitiesFailed, err)
      return []
    }
  }

  async getEntitiesByType(projectId: string, type: EntityType): Promise<EntityReference[]> {
    try {
      const dbEntities = await db
        .select()
        .from(entityReferences)
        .where(and(eq(entityReferences.projectId, projectId), eq(entityReferences.type, type)))

      return dbEntities
        .map(e => this.dbToEntity(e))
        .filter((entity): entity is EntityReference => entity !== null)
    } catch (err) {
      console.warn(EntityRegistryLog.EntitiesByTypeFailed, err)
      return []
    }
  }

  async markReferenced(refId: string): Promise<void> {
    const entity = this.cache.get(refId)
    if (entity) {
      entity.lastReferencedAt = new Date()
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refId)
    if (!isUuid) return

    try {
      await db
        .update(entityReferences)
        .set({ lastReferencedAt: new Date() })
        .where(eq(entityReferences.id, refId))
    } catch (err) {
      console.warn(EntityRegistryLog.UpdateReferenceFailed, err)
    }
  }

  async delete(refId: string): Promise<void> {
    this.cache.delete(refId)

    for (const [_projectId, refs] of this.projectCaches) {
      refs.delete(refId)
    }

    try {
      await db.delete(entityReferences).where(eq(entityReferences.id, refId))
    } catch (err) {
      console.warn(EntityRegistryLog.DeleteFailed, err)
    }
  }

  async syncFromSource(
    projectId: string,
    type: EntityType,
    entities: Array<{ id: string; name: string; description?: string; [key: string]: unknown }>
  ): Promise<void> {
    for (const entity of entities) {
      const existing = await this.findByNameAndType(projectId, entity.name, type)
      if (!existing) {
        await this.register({
          type,
          name: entity.name,
          description: entity.description || '',
          metadata: entity,
          projectId,
          sourceEntityId: entity.id,
        })
      }
    }
  }

  clearProjectCache(projectId: string): void {
    const refs = this.projectCaches.get(projectId)
    if (refs) {
      for (const refId of refs) {
        this.cache.delete(refId)
      }
      this.projectCaches.delete(projectId)
    }
  }

  private cacheEntity(entity: EntityReference, projectId: string): void {
    this.cache.set(entity.id, entity)
    if (!this.projectCaches.has(projectId)) {
      this.projectCaches.set(projectId, new Set())
    }
    this.projectCaches.get(projectId)?.add(entity.id)
  }

  private async persistEntity(entity: EntityReference): Promise<void> {
    await db
      .insert(entityReferences)
      .values({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        description: entity.description,
        metadata: entity.metadata,
        projectId: entity.projectId,
        sourceEntityId: entity.sourceEntityId,
        createdAt: entity.createdAt,
        lastReferencedAt: entity.lastReferencedAt,
      })
      .onConflictDoUpdate({
        target: entityReferences.id,
        set: {
          name: entity.name,
          description: entity.description,
          metadata: entity.metadata,
          lastReferencedAt: entity.lastReferencedAt,
        },
      })

    generateEntityEmbedding(entity).catch(err => {
      console.warn(`[EntityRegistry] Embedding generation failed for ${entity.id}:`, err)
    })
  }

  private dbToEntity(dbEntity: typeof entityReferences.$inferSelect): EntityReference | null {
    const type = parseEntityType(dbEntity.type)
    if (!type) {
      console.warn(`[EntityRegistry] Skipping row with invalid type: ${dbEntity.type}`)
      return null
    }

    let description = dbEntity.description || ''
    if (description.startsWith(EntityRegistryNote.AutoRegistered)) {
      description = ''
    }

    return {
      id: dbEntity.id,
      type,
      name: dbEntity.name,
      description,
      metadata: entityMetadata(dbEntity.metadata),
      projectId: dbEntity.projectId,
      sourceEntityId: dbEntity.sourceEntityId ?? undefined,
      createdAt: new Date(dbEntity.createdAt),
      lastReferencedAt: new Date(dbEntity.lastReferencedAt || dbEntity.createdAt),
    }
  }
}

export const entityRegistry = new EntityRegistryService()
export { EntityRegistryService }
