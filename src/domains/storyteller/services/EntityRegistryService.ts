/**
 * Entity Registry Service (SERVER-ONLY)
 *
 * Manages entity references for smart context assembly and UI rendering.
 * Entities are referenced in LLM output using MD-style links: [Display Name][entity-type-uuid]
 *
 * Features:
 * - In-memory LRU cache for fast lookups
 * - DB sync for persistence
 * - Reference extraction from text
 * - Integration with GraphRAG for relationship traversal
 *
 * NOTE: This module uses database access and should only be imported server-side.
 * For client-side usage, use the API endpoints:
 * - GET /api/entities/resolve
 * - POST /api/entities/mark-referenced
 */

import { entityReferences } from '@/db'
import { db } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Re-export types from reference-parser for convenience
export { ENTITY_PREFIXES, PREFIX_TO_TYPE } from '@/domains/storyteller/core/ReferenceParser'

export type { EntityType } from '@/domains/storyteller/core/ReferenceParser'

import { EntityType, ENTITY_PREFIXES, PREFIX_TO_TYPE } from '@/domains/storyteller/core/ReferenceParser'

export interface EntityReference {
  id: string // e.g., "char-a1b2c3d4"
  type: EntityType
  name: string // Display name
  description: string // For tooltip
  metadata: Record<string, unknown> // Full entity data
  projectId: string
  sourceEntityId?: string // Link to original table
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

// LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  values(): IterableIterator<V> {
    return this.cache.values()
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }
}

/**
 * Reference pattern for parsing entity references from text
 * Matches: [Display Name][entity-type-uuid]
 * Groups: [1] = Display Name, [2] = Full ID (e.g., char-abc123)
 */
export const REFERENCE_PATTERN = /\[([^\]]+)\]\[([a-z]+-[a-zA-Z0-9-]+)\]/g

/**
 * Extract entity type from reference ID
 */
export function getEntityTypeFromId(refId: string): EntityType | null {
  const prefix = refId.split('-')[0]
  return PREFIX_TO_TYPE[prefix] || null
}

/**
 * Generate a reference ID for an entity
 */
export function generateReferenceId(type: EntityType): string {
  const prefix = ENTITY_PREFIXES[type]
  const shortUuid = uuidv4().split('-')[0] // Use first segment for brevity
  return `${prefix}-${shortUuid}`
}

class EntityRegistryService {
  private cache = new LRUCache<string, EntityReference>(1000)
  private projectCaches = new Map<string, Set<string>>() // projectId -> Set of refIds

  /**
   * Register a new entity and return its reference ID
   */
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

    // Add to cache
    this.cache.set(refId, entity)

    // Track by project
    if (!this.projectCaches.has(input.projectId)) {
      this.projectCaches.set(input.projectId, new Set())
    }
    this.projectCaches.get(input.projectId)!.add(refId)

    // Persist to DB (async, non-blocking)
    this.persistEntity(entity).catch(err => {
      console.warn('[EntityRegistry] Failed to persist entity:', err)
    })

    return refId
  }

  /**
   * Register an entity with an explicit ID (for auto-linking)
   * This allows us to register entities with predictable IDs like "faction-the-mood-wardens"
   */
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

    // Add to cache
    this.cache.set(refId, entity)

    // Track by project
    if (!this.projectCaches.has(input.projectId)) {
      this.projectCaches.set(input.projectId, new Set())
    }
    this.projectCaches.get(input.projectId)!.add(refId)

    // Persist to DB (async, non-blocking)
    this.persistEntity(entity).catch(err => {
      console.warn('[EntityRegistry] Failed to persist entity:', err)
    })

    console.log(`[EntityRegistry] Registered entity with explicit ID: ${refId}`)
    return refId
  }

  /**
   * Register an entity if it doesn't exist, or return existing ID
   */
  async registerIfNotExists(input: RegisterEntityInput): Promise<string> {
    // Check if entity with same name and type exists in project
    const existing = await this.findByNameAndType(input.projectId, input.name, input.type)
    if (existing) {
      return existing.id
    }
    return this.register(input)
  }

  /**
   * Find entity by name and type in a project
   */
  async findByNameAndType(
    projectId: string,
    name: string,
    type: EntityType
  ): Promise<EntityReference | null> {
    // Check cache first
    const projectRefs = this.projectCaches.get(projectId)
    if (projectRefs) {
      for (const refId of projectRefs) {
        const entity = this.cache.get(refId)
        if (entity && entity.name.toLowerCase() === name.toLowerCase() && entity.type === type) {
          return entity
        }
      }
    }

    // Check DB
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
        this.cache.set(entity.id, entity)
        return entity
      }
    } catch (err) {
      console.warn('[EntityRegistry] DB lookup failed:', err)
    }

    return null
  }

  /**
   * Resolve a reference ID to its full entity
   */
  async resolve(refId: string): Promise<EntityReference | null> {
    // Check cache first
    const cached = this.cache.get(refId)
    if (cached) {
      return cached
    }

    // Check DB
    try {
      const [dbEntity] = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.id, refId))
        .limit(1)

      if (dbEntity) {
        const entity = this.dbToEntity(dbEntity)
        this.cache.set(refId, entity)
        return entity
      }
    } catch (err) {
      console.warn('[EntityRegistry] Failed to resolve entity:', err)
    }

    return null
  }

  /**
   * Resolve multiple reference IDs at once
   */
  async resolveMany(refIds: string[]): Promise<Map<string, EntityReference>> {
    const result = new Map<string, EntityReference>()
    const missingIds: string[] = []

    // Check cache first
    for (const refId of refIds) {
      const cached = this.cache.get(refId)
      if (cached) {
        result.set(refId, cached)
      } else {
        missingIds.push(refId)
      }
    }

    // Fetch missing from DB
    if (missingIds.length > 0) {
      try {
        const dbEntities = await db
          .select()
          .from(entityReferences)
          .where(inArray(entityReferences.id, missingIds))

        for (const dbEntity of dbEntities) {
          const entity = this.dbToEntity(dbEntity)
          this.cache.set(entity.id, entity)
          result.set(entity.id, entity)
        }
      } catch (err) {
        console.warn('[EntityRegistry] Failed to resolve entities:', err)
      }
    }

    return result
  }

  /**
   * Extract all entity reference IDs from text
   * Returns array of reference IDs (e.g., ["char-abc123", "place-def456"])
   */
  extractReferences(text: string): string[] {
    const refs: string[] = []
    const pattern = new RegExp(REFERENCE_PATTERN.source, 'g')
    let match

    while ((match = pattern.exec(text)) !== null) {
      refs.push(match[2]) // match[2] is the reference ID
    }

    return [...new Set(refs)] // Deduplicate
  }

  /**
   * Extract reference IDs with their display names
   */
  extractReferencesWithNames(text: string): Array<{ name: string; refId: string }> {
    const refs: Array<{ name: string; refId: string }> = []
    const pattern = new RegExp(REFERENCE_PATTERN.source, 'g')
    let match

    while ((match = pattern.exec(text)) !== null) {
      refs.push({ name: match[1], refId: match[2] })
    }

    return refs
  }

  /**
   * Get all entities for a project
   */
  async getProjectEntities(projectId: string): Promise<EntityReference[]> {
    try {
      const dbEntities = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.projectId, projectId))

      const entities = dbEntities.map(e => this.dbToEntity(e))

      // Update cache
      for (const entity of entities) {
        this.cache.set(entity.id, entity)
        if (!this.projectCaches.has(projectId)) {
          this.projectCaches.set(projectId, new Set())
        }
        this.projectCaches.get(projectId)!.add(entity.id)
      }

      return entities
    } catch (err) {
      console.warn('[EntityRegistry] Failed to get project entities:', err)
      return []
    }
  }

  /**
   * Get entities by type for a project
   */
  async getEntitiesByType(projectId: string, type: EntityType): Promise<EntityReference[]> {
    try {
      const dbEntities = await db
        .select()
        .from(entityReferences)
        .where(and(eq(entityReferences.projectId, projectId), eq(entityReferences.type, type)))

      return dbEntities.map(e => this.dbToEntity(e))
    } catch (err) {
      console.warn('[EntityRegistry] Failed to get entities by type:', err)
      return []
    }
  }

  /**
   * Update last referenced timestamp
   */
  async markReferenced(refId: string): Promise<void> {
    const entity = this.cache.get(refId)
    if (entity) {
      entity.lastReferencedAt = new Date()
    }

    // Only attempt DB update if refId is a valid UUID
    // Some components pass short IDs (e.g., 'rule-afc7dfc0') which crash PostgreSQL
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refId)
    if (!isUuid) {
      return
    }

    try {
      await db
        .update(entityReferences)
        .set({ lastReferencedAt: new Date() })
        .where(eq(entityReferences.id, refId))
    } catch (err) {
      console.warn('[EntityRegistry] Failed to update reference timestamp:', err)
    }
  }

  /**
   * Delete an entity reference
   */
  async delete(refId: string): Promise<void> {
    this.cache.delete(refId)

    // Remove from project cache
    for (const [projectId, refs] of this.projectCaches) {
      refs.delete(refId)
    }

    try {
      await db.delete(entityReferences).where(eq(entityReferences.id, refId))
    } catch (err) {
      console.warn('[EntityRegistry] Failed to delete entity:', err)
    }
  }

  /**
   * Sync all cached entities from a specific source (e.g., characters table)
   * This is called when loading a project to pre-populate the registry
   */
  async syncFromSource(
    projectId: string,
    type: EntityType,
    entities: Array<{ id: string; name: string; description?: string;[key: string]: any }>
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

  /**
   * Clear cache for a project
   */
  clearProjectCache(projectId: string): void {
    const refs = this.projectCaches.get(projectId)
    if (refs) {
      for (const refId of refs) {
        this.cache.delete(refId)
      }
      this.projectCaches.delete(projectId)
    }
  }

  // Private helpers

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

    // Auto-generate Voyage embedding (async, non-blocking)
    this.generateEmbedding(entity).catch(err => {
      console.warn(`[EntityRegistry] Embedding generation failed for ${entity.id}:`, err)
    })
  }

  /**
   * Generate Voyage embedding for an entity and store it
   */
  private async generateEmbedding(entity: EntityReference): Promise<void> {
    try {
      const { entityGraphService } = await import('./EntityGraphService')

      // Build embedding content from entity name, type, description, and key metadata
      const metaParts: string[] = []
      const meta = entity.metadata || {}

      if (typeof meta.role === 'string') metaParts.push(`Role: ${meta.role}`)
      if (typeof meta.archetype === 'string') metaParts.push(`Archetype: ${meta.archetype}`)
      if (typeof meta.motivation === 'string') metaParts.push(`Motivation: ${meta.motivation}`)
      if (typeof meta.ideology === 'string') metaParts.push(`Ideology: ${meta.ideology}`)
      if (typeof meta.description === 'string') metaParts.push(meta.description)
      if (typeof meta.powerStructure === 'string') metaParts.push(meta.powerStructure)
      if (meta.goals && Array.isArray(meta.goals)) metaParts.push(`Goals: ${meta.goals.join(', ')}`)

      const embeddingContent = [
        `${entity.type}: ${entity.name}`,
        entity.description || '',
        ...metaParts,
      ]
        .filter(Boolean)
        .join('. ')

      if (embeddingContent.length < 5) return // Skip if too little content

      await entityGraphService.buildEntityEmbedding(entity.id, embeddingContent)
      console.log(`🧠 [EntityRegistry] Generated embedding for ${entity.id}`)
    } catch (err) {
      // Non-critical - embeddings enhance search but aren't required
      console.warn(`[EntityRegistry] Embedding failed for ${entity.id}:`, err)
    }
  }

  private dbToEntity(dbEntity: any): EntityReference {
    let description = dbEntity.description || ''
    if (description.startsWith('Auto-registered')) {
      description = ''
    }

    return {
      id: dbEntity.id,
      type: dbEntity.type as EntityType,
      name: dbEntity.name,
      description,
      metadata: (dbEntity.metadata as Record<string, unknown>) || {},
      projectId: dbEntity.projectId,
      sourceEntityId: dbEntity.sourceEntityId,
      createdAt: new Date(dbEntity.createdAt),
      lastReferencedAt: new Date(dbEntity.lastReferencedAt || dbEntity.createdAt),
    }
  }
}

// Singleton instance
export const entityRegistry = new EntityRegistryService()

// Export class for testing
export { EntityRegistryService }
