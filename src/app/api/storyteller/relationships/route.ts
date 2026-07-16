/**
 * Storyteller Relationships API
 *
 * Builds a relationship graph from ALL available data sources:
 * 0. LLM extraction (generateObject) — primary, grounded in story text with evidence
 * 1. entity_references table (with Voyage embeddings for similarity) — supplemental
 * 2. storyPlan factions (explicit membership/rivalry) — high confidence
 * 3. Text co-occurrence in worldDescription, plotTwists, faction descriptions
 *
 * Edge weights:
 * - LLM-extracted (0.6-1.0, with textual evidence)
 * - Explicit membership/rivalry (0.8-0.9)
 * - Embedding cosine similarity (supplemental, 0.45-1.0, labelled 'associated' only)
 * - Text co-occurrence (0.4-0.6)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import {
  RelationshipsApiError,
  RelationshipsApiLog,
  RelationshipsQueryParam,
} from '@/domains/storyteller/core/io/constants/relationships-api'
import { buildRelationshipGraph } from './_lib/build-relationship-graph'
import type { RelationshipResponse } from './_lib/graph-types'

export const GET = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get(RelationshipsQueryParam.ProjectId)

    if (!projectId) {
      return NextResponse.json({ error: RelationshipsApiError.MissingProjectId }, { status: 400 })
    }

    const graph = await buildRelationshipGraph(projectId, request.url)
    if (!graph) {
      return NextResponse.json({ error: RelationshipsApiError.ProjectNotFound }, { status: 404 })
    }

    return NextResponse.json(graph satisfies RelationshipResponse)
  } catch (error) {
    console.error(RelationshipsApiLog.ApiFailed, error)
    return NextResponse.json({ error: RelationshipsApiError.FetchFailed }, { status: 500 })
  }
})
