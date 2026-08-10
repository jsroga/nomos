import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import {
  contextualSummaryService,
  entityRegistry,
  relationshipEnricher,
  tryAutoRegisterEntity,
} from '@/domains/storyteller/server'

const MAX_CONTEXT_LENGTH = 1000
const MAX_CONTEXTUAL_SUMMARIES = 10
/** Below this there is no surrounding text worth sending to the model. */
const MIN_CONTEXT_LENGTH = 10

export async function resolveEntitiesWithAutoRegister(
  ids: string[],
  projectId: string,
  context: string | null
): Promise<EntityReference[]> {
  let resolved = await entityRegistry.resolveMany(ids)
  const unresolvedIds = ids.filter(id => !resolved.has(id))

  if (unresolvedIds.length > 0) {
    console.log(
      `[Entity Resolution] Attempting to auto-register ${unresolvedIds.length} unresolved entities`
    )
    await Promise.all(
      unresolvedIds.map(id => tryAutoRegisterEntity(id, projectId, context))
    )
    resolved = await entityRegistry.resolveMany(ids)
  }

  return Array.from(resolved.values())
}

export async function enrichEntitiesWithRelationships(
  entities: EntityReference[],
  projectId: string
): Promise<EntityReference[]> {
  return Promise.all(
    entities.map(async entity => {
      const enriched = await relationshipEnricher.enrichEntity(
        entity.id,
        entity.type,
        entity.name,
        projectId,
        entity.description
      )

      return {
        ...entity,
        relationships: enriched.relationships,
        relationshipSummary: enriched.relationshipSummary,
      }
    })
  )
}

function partitionEntitiesByDescription(
  entities: EntityReference[]
): { withoutDescription: EntityReference[]; withDescription: EntityReference[] } {
  const withoutDescription: EntityReference[] = []
  const withDescription: EntityReference[] = []
  for (const entity of entities) {
    if (!entity.description || entity.description.trim() === '') {
      withoutDescription.push(entity)
    } else {
      withDescription.push(entity)
    }
  }
  return { withoutDescription, withDescription }
}

async function enrichEntityWithContextualSummary(
  entity: EntityReference,
  safeContext: string,
  projectId: string
): Promise<EntityReference> {
  try {
    const { contextualSummary } = await contextualSummaryService.generate({
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      entityDescription: entity.description || '',
      surroundingText: safeContext,
      projectId,
    })

    return {
      ...entity,
      contextualSummary,
    }
  } catch (err) {
    console.warn(`[Entity Resolution] Contextual summary failed for ${entity.id}:`, err)
    return entity
  }
}

export async function applyContextualSummaries(
  entities: EntityReference[],
  projectId: string,
  context: string | null
): Promise<EntityReference[]> {
  const safeContext = context ? context.slice(0, MAX_CONTEXT_LENGTH) : ''
  const hasValidContext = safeContext.length > MIN_CONTEXT_LENGTH

  // Each summary is an LLM round trip. Without surrounding text there is nothing
  // to contextualise, and 10 of them stall the caller (and starve the browser's
  // connection pool) for ~20s to produce nothing useful.
  if (!hasValidContext) {
    return entities
  }

  const { withoutDescription, withDescription } = partitionEntitiesByDescription(entities)
  const entitiesToEnrich = [...withoutDescription, ...withDescription].slice(
    0,
    MAX_CONTEXTUAL_SUMMARIES
  )
  const enrichedIds = new Set(entitiesToEnrich.map(entity => entity.id))
  const remainingEntities = entities.filter(entity => !enrichedIds.has(entity.id))

  const contextualEntities = await Promise.all(
    entitiesToEnrich.map(entity =>
      enrichEntityWithContextualSummary(entity, safeContext, projectId)
    )
  )

  return [...contextualEntities, ...remainingEntities]
}
