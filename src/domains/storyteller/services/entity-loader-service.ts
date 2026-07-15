import { EntityReference } from '@/domains/storyteller/core/entities/EntityReferences'
import { parseEntityType, entityMetadata } from '@/domains/storyteller/core/entities/entity-type-guards'
import { readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { ENTITY_FETCH_FAILED_MESSAGE } from '@/domains/storyteller/services/constants/entity-loader'

function entityReferenceFromJson(value: unknown): EntityReference | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const name = readString(row.name)
  const type = parseEntityType(row.type)
  const projectId = readString(row.projectId)
  if (!id || !name || !type || !projectId) return null

  return {
    id,
    type,
    name,
    description: readString(row.description) ?? '',
    metadata: entityMetadata(row.metadata),
    projectId,
    sourceEntityId: readString(row.sourceEntityId),
    createdAt: new Date(readString(row.createdAt) ?? Date.now()),
    lastReferencedAt: new Date(readString(row.lastReferencedAt) ?? Date.now()),
    relationshipSummary: readString(row.relationshipSummary),
    contextualSummary: readString(row.contextualSummary),
  }
}

/**
 * EntityLoader
 *
 * Implements the Dataloader pattern to batch multiple entity resolution requests
 * into a single API call.
 */
export class EntityLoader {
  private queue: Map<
    string,
    {
      resolve: (value: EntityReference | null) => void
      reject: (reason?: any) => void
      projectId: string
      context?: string
    }
  > = new Map()
  private timeout: NodeJS.Timeout | null = null
  private readonly delay: number

  constructor(delay = 50) {
    this.delay = delay
  }

  /**
   * Load an entity by ID
   */
  load(id: string, projectId: string, context?: string): Promise<EntityReference | null> {
    return new Promise((resolve, reject) => {
      const key = `${projectId}:${id}`

      // Store context if provided (last one wins for the batch)
      this.queue.set(key, { resolve, reject, projectId, context })

      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay)
      }
    })
  }

  private async flush() {
    this.timeout = null
    const currentQueue = new Map(this.queue)
    this.queue.clear()

    if (currentQueue.size === 0) return

    // Group by projectId
    const byProject: Record<string, { ids: string[]; contexts: Map<string, string> }> = {}

    for (const [key, { projectId, context }] of currentQueue.entries()) {
      const originalId = key.split(':')[1]

      if (!byProject[projectId]) {
        byProject[projectId] = { ids: [], contexts: new Map() }
      }
      byProject[projectId].ids.push(originalId)
      if (context) {
        byProject[projectId].contexts.set(originalId, context)
      }
    }

    // Fire requests per project
    await Promise.all(
      Object.entries(byProject).map(async ([projectId, { ids, contexts }]) => {
        try {
          const uniqueIds = Array.from(new Set(ids))

          // We'll pass the first available context for the batch, 
          // or we could pass no context and let the API decide.
          // For now, take the longest context string from this batch to ensure 
          // generation gets enough data.
          let bestContext = ''
          for (const ctx of contexts.values()) {
            if (ctx && ctx.length > bestContext.length) {
              bestContext = ctx
            }
          }

          let url = `/api/entities/resolve?projectId=${projectId}&ids=${uniqueIds.join(',')}&enrichRelationships=true`
          if (bestContext) {
            url += `&context=${encodeURIComponent(bestContext)}`
          }

          const res = await fetch(url)

          if (!res.ok) throw new Error(ENTITY_FETCH_FAILED_MESSAGE)

          const data = recordFromJson(await res.json())
          const entities = recordArrayFromJson(data.entities)
            .map(entityReferenceFromJson)
            .filter((entity): entity is EntityReference => entity !== null)
          const entityMap = new Map(entities.map(e => [e.id, e]))

          // Resolve promises
          ids.forEach(originalId => {
            const key = `${projectId}:${originalId}`
            const handler = currentQueue.get(key)
            if (handler) {
              handler.resolve(entityMap.get(originalId) || null)
            }
          })
        } catch (error) {
          // Reject all for this project
          ids.forEach(originalId => {
            const key = `${projectId}:${originalId}`
            const handler = currentQueue.get(key)
            if (handler) {
              handler.reject(error)
            }
          })
        }
      })
    )
  }
}

// Global instance for singleton usage if needed,
// though usually we instantiated it inside a helper or exported const.
export const entityLoader = new EntityLoader()
