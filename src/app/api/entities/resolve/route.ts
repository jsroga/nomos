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
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import {
  applyContextualSummaries,
  enrichEntitiesWithRelationships,
  resolveEntitiesWithAutoRegister,
} from './_lib/entity-resolve-enrichment'
import { parseEntityResolveQuery } from './_lib/entity-resolve-query'

export async function GET(request: NextRequest) {
  try {
    const parsed = await parseEntityResolveQuery(request)
    if (!parsed.ok) {
      return parsed.response
    }

    const { projectId, ids, enrichRelationships, context } = parsed.query

    let entities = await resolveEntitiesWithAutoRegister(ids, projectId, context)

    if (enrichRelationships) {
      entities = await enrichEntitiesWithRelationships(entities, projectId)
    }

    entities = await applyContextualSummaries(entities, projectId, context)

    return NextResponse.json({ entities })
  } catch (error) {
    console.error(API_LOG_PREFIX.ENTITY_RESOLUTION_FAILED, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_RESOLVE_ENTITIES },
      { status: HttpStatus.INTERNAL }
    )
  }
}
