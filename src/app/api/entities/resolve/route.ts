/**
 * Entity Resolution API
 *
 * Resolves entity reference IDs to their full entity details.
 * Used by client-side components to fetch entity data without
 * importing server-only database code.
 *
 * If entities aren't found in the registry, attempts to create them
 * from existing project data (characters, factions, etc.)
 *
 * Query params:
 * - projectId: Required
 * - ids: Comma-separated entity IDs
 * - enrichRelationships: Add relationship data
 * - context: Surrounding text for AI-generated contextual summaries
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  contextualSummaryService,
  entityRegistry,
  relationshipEnricher,
} from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  BooleanQueryValue,
  HttpStatus,
  QueryParam,
} from '@/shared/data/constants/protocol'
import { tryAutoRegisterEntity } from './_lib/entity-auto-register'

export async function GET(request: NextRequest) {
  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/shared/auth/auth')
    const { verifyProjectAccess } = await import('@/domains/storyteller/server')

    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get(QueryParam.ProjectId)
    const idsParam = searchParams.get(QueryParam.Ids)
    const enrichRelationships =
      searchParams.get(QueryParam.EnrichRelationships) === BooleanQueryValue.True
    const context = searchParams.get(QueryParam.Context)

    if (!projectId) {
      return NextResponse.json(
        { error: API_ERROR.MISSING_PROJECT_ID },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json(
        { error: API_ERROR.PROJECT_ACCESS_DENIED },
        { status: HttpStatus.FORBIDDEN }
      )
    }

    if (!idsParam) {
      return NextResponse.json(
        { error: API_ERROR.MISSING_IDS_PARAMETER },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    // Security: Limit number of IDs to prevent abuse
    const ids = idsParam
      .split(',')
      .filter(id => id.trim())
      .slice(0, 50) // Max 50 entities per request

    // Security: Validate ID format (allow alphanumeric, hyphens, underscores, dots, and apostrophes)
    const validIdPattern = /^[a-z0-9-_.'’]+$/i
    const invalidIds = ids.filter(id => !validIdPattern.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_ENTITY_IDS_FORMAT, invalidIds },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    if (ids.length === 0) {
      return NextResponse.json({ entities: [] })
    }

    // First try to resolve from registry
    let resolved = await entityRegistry.resolveMany(ids)

    // Find unresolved IDs and try to auto-register them
    const unresolvedIds = ids.filter(id => !resolved.has(id))

    if (unresolvedIds.length > 0) {
      console.log(
        `[Entity Resolution] Attempting to auto-register ${unresolvedIds.length} unresolved entities`
      )
      // Try to auto-register from project data
      const autoRegisterPromises = unresolvedIds.map(id =>
        tryAutoRegisterEntity(id, projectId, context)
      )
      await Promise.all(autoRegisterPromises)

      // Re-resolve after auto-registration
      resolved = await entityRegistry.resolveMany(ids)
    }

    let entities = Array.from(resolved.values())

    // Optionally enrich with relationship data
    if (enrichRelationships) {
      const enrichedEntities = await Promise.all(
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
      entities = enrichedEntities
    }

    // Generate AI contextual summaries
    // Security: Limit context length to prevent abuse (max 1000 chars)
    const safeContext = context ? context.slice(0, 1000) : ''

    const hasValidContext = safeContext.length > 10
    const needsBaselineSummary = entities.some(e => !e.description || e.description.trim() === '')

    if (hasValidContext || needsBaselineSummary) {
      // Prioritize entities without descriptions, then fill remaining slots up to 10
      const entitiesWithoutDesc = entities.filter(e => !e.description || e.description.trim() === '')
      const entitiesWithDesc = entities.filter(e => e.description && e.description.trim() !== '')

      // Security: Limit to 10 entities for contextual summaries to prevent excessive LLM calls
      const entitiesToEnrich = [...entitiesWithoutDesc, ...entitiesWithDesc].slice(0, 10)
      const enrichedIds = new Set(entitiesToEnrich.map(e => e.id))
      const remainingEntities = entities.filter(e => !enrichedIds.has(e.id))

      const contextualEntities = await Promise.all(
        entitiesToEnrich.map(async entity => {
          try {
            const { contextualSummary, cacheHit } = await contextualSummaryService.generate({
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
              contextualSummaryCacheHit: cacheHit,
            }
          } catch (err) {
            console.warn(`[Entity Resolution] Contextual summary failed for ${entity.id}:`, err)
            return entity
          }
        })
      )
      entities = [...contextualEntities, ...remainingEntities]
    }

    return NextResponse.json({ entities })
  } catch (error) {
    console.error(API_LOG_PREFIX.ENTITY_RESOLUTION_FAILED, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_RESOLVE_ENTITIES },
      { status: HttpStatus.INTERNAL }
    )
  }
}
