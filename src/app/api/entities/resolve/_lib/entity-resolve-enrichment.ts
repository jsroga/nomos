import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import type { ProjectScope } from '@/shared/auth/project-scope'
import {
  contextualSummaryService,
  entityRegistry,
  relationshipEnricher,
  tryAutoRegisterEntity,
} from '@/domains/storyteller/server'
import {
  fillMissingEntityDescriptions,
  generateBaseEntityDescription,
} from '@/domains/storyteller/services/entity-base-description-service'
import { entityNeedsDescription } from '@/domains/storyteller/services/constants/entity-needs-description'
import { hasUsefulResolveContext } from '@/domains/storyteller/services/constants/entity-base-description'
import {
  displayNameFromRefId,
  getEntityTypeFromId,
} from '@/domains/storyteller/services/entity-registry-reference-id'

const MAX_CONTEXT_LENGTH = 1000
const MAX_CONTEXTUAL_SUMMARIES = 10

async function registerMissingAsGeneratedStubs(
  ids: string[],
  resolved: Map<string, EntityReference>,
  scope: ProjectScope,
  context: string | null
): Promise<Map<string, EntityReference>> {
  const missing = ids.filter(id => !resolved.has(id))
  if (missing.length === 0) return resolved

  await Promise.all(
    missing.map(async id => {
      const type = getEntityTypeFromId(id)
      if (!type) return
      const name = displayNameFromRefId(id) || id
      const description = await generateBaseEntityDescription({
        name,
        type,
        surroundingText: context ?? '',
        projectId: scope.projectId,
      })
      await entityRegistry.registerWithId(id, {
        name,
        description,
        metadata: { inferredFromText: true },
        scope,
      })
    })
  )
  return entityRegistry.resolveMany(ids)
}

export async function resolveEntitiesWithAutoRegister(
  ids: string[],
  scope: ProjectScope,
  context: string | null
): Promise<EntityReference[]> {
  let resolved = await entityRegistry.resolveMany(ids)
  const unresolvedIds = ids.filter(id => !resolved.has(id))

  if (unresolvedIds.length > 0) {
    console.log(
      `[Entity Resolution] Attempting to auto-register ${unresolvedIds.length} unresolved entities`
    )
    await Promise.all(
      unresolvedIds.map(id => tryAutoRegisterEntity(id, scope, context))
    )
    resolved = await entityRegistry.resolveMany(ids)
  }

  resolved = await registerMissingAsGeneratedStubs(ids, resolved, scope, context)
  return Array.from(resolved.values())
}

export async function enrichEntitiesWithRelationships(
  entities: EntityReference[],
  scope: ProjectScope
): Promise<EntityReference[]> {
  return Promise.all(
    entities.map(async entity => {
      const enriched = await relationshipEnricher.enrichEntity(
        entity.id,
        entity.type,
        entity.name,
        scope,
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
    if (entityNeedsDescription(entity.description, entity.name)) {
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
  scope: ProjectScope
): Promise<EntityReference> {
  try {
    const { contextualSummary } = await contextualSummaryService.generate({
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      entityDescription: entity.description || '',
      surroundingText: safeContext,
      scope,
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

async function withFilledDescriptions(
  entities: EntityReference[],
  safeContext: string
): Promise<EntityReference[]> {
  const { withoutDescription } = partitionEntitiesByDescription(entities)
  if (withoutDescription.length === 0) return entities
  const filled = await fillMissingEntityDescriptions(
    withoutDescription,
    safeContext,
    generateBaseEntityDescription,
    (id, description) => entityRegistry.updateDescription(id, description)
  )
  const filledById = new Map(filled.map(entity => [entity.id, entity]))
  return entities.map(entity => filledById.get(entity.id) ?? entity)
}

export async function applyContextualSummaries(
  entities: EntityReference[],
  scope: ProjectScope,
  context: string | null
): Promise<EntityReference[]> {
  const safeContext = context ? context.slice(0, MAX_CONTEXT_LENGTH) : ''
  const withBase = await withFilledDescriptions(entities, safeContext)

  if (!hasUsefulResolveContext(safeContext)) {
    return withBase
  }

  const entitiesToEnrich = withBase.slice(0, MAX_CONTEXTUAL_SUMMARIES)
  const enrichedIds = new Set(entitiesToEnrich.map(entity => entity.id))
  const remainingEntities = withBase.filter(entity => !enrichedIds.has(entity.id))

  const contextualEntities = await Promise.all(
    entitiesToEnrich.map(entity =>
      enrichEntityWithContextualSummary(entity, safeContext, scope)
    )
  )

  return [...contextualEntities, ...remainingEntities]
}
