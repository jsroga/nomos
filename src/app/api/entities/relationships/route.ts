import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam, SupabaseColumn, SupabaseTable } from '@/shared/data/constants/protocol'
import { openApiCreateRelationshipRequestSchema } from '@/shared/openapi/schemas/entities'
/**
 * GET /api/entities/relationships
 * Get relationships for entities
 * Query params:
 *   - entityId: UUID (required) - get all relationships for this entity
 *   - projectId: UUID (optional) - filter by project
 */
export const GET = withAuth(
  async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get(QueryParam.EntityId)
    const projectId = searchParams.get(QueryParam.ProjectId)

    if (!entityId) {
      return NextResponse.json({ error: API_ERROR.ENTITY_ID_QUERY_REQUIRED }, { status: 400 })
    }

    // Validate entityId is a UUID to prevent PostgREST filter injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)) {
      return NextResponse.json({ error: API_ERROR.INVALID_ENTITY_ID_FORMAT }, { status: 400 })
    }

    // If projectId provided, verify access
    if (projectId) {
      const hasAccess = await verifyProjectAccess(supabase, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }
    }

    // RLS will filter relationships based on project access
    let query = supabase
      .from(SupabaseTable.EntityRelationships)
      .select(
        `
      *,
      from_entity:game_entities!from_entity_id(*),
      to_entity:game_entities!to_entity_id(*)
    `
      )
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)

    if (projectId) {
      query = query.eq(SupabaseColumn.ProjectId, projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error(API_LOG_PREFIX.RELATIONSHIPS_FETCH_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_FETCH_RELATIONSHIPS }, { status: 500 })
    }

    return NextResponse.json({ relationships: data })
  }
)

/**
 * POST /api/entities/relationships
 * Create a new relationship between entities
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const body = await request.json()

    try {
      const validated = openApiCreateRelationshipRequestSchema.parse(body)

      // Prevent self-relationships
      if (validated.fromEntityId === validated.toEntityId) {
        return NextResponse.json(
          { error: API_ERROR.CANNOT_RELATE_ENTITY_TO_SELF },
          { status: 400 }
        )
      }

      // Verify project access via RLS
      const hasAccess = await verifyProjectAccess(supabase, validated.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }

      const { data, error } = await supabase
        .from(SupabaseTable.EntityRelationships)
        .insert({
          project_id: validated.projectId,
          from_entity_id: validated.fromEntityId,
          to_entity_id: validated.toEntityId,
          relationship_type: validated.relationshipType,
          metadata: validated.metadata || {},
        })
        .select(
          `
          *,
          from_entity:game_entities!from_entity_id(*),
          to_entity:game_entities!to_entity_id(*)
        `
        )
        .single()

      if (error) {
        console.error(API_LOG_PREFIX.RELATIONSHIPS_CREATE_ERROR, error)
        return NextResponse.json({ error: API_ERROR.FAILED_CREATE_RELATIONSHIP }, { status: 500 })
      }

      return NextResponse.json({ relationship: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: API_ERROR.INVALID_REQUEST, details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
  }),
  { maxRequests: 30, windowMs: 60000 }
)

/**
 * DELETE /api/entities/relationships
 * Delete a relationship
 * Query params:
 *   - id: UUID (required) - relationship ID to delete
 */
export const DELETE = withAuth(
  async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get(QueryParam.Id)

    if (!relationshipId) {
      return NextResponse.json({ error: API_ERROR.RELATIONSHIP_ID_REQUIRED }, { status: 400 })
    }

    // RLS will ensure user can only delete relationships in their projects
    const { error } = await supabase
      .from(SupabaseTable.EntityRelationships)
      .delete()
      .eq(QueryParam.Id, relationshipId)

    if (error) {
      console.error(API_LOG_PREFIX.RELATIONSHIPS_DELETE_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_DELETE_RELATIONSHIP }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
)
