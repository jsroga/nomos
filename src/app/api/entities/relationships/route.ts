import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

// Relationship creation schema
const createRelationshipSchema = z.object({
  projectId: z.string().uuid(),
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  relationshipType: z.enum([
    'uses',
    'located_in',
    'conflicts_with',
    'allies_with',
    'owns',
    'part_of',
  ]),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/entities/relationships
 * Get relationships for entities
 * Query params:
 *   - entityId: UUID (required) - get all relationships for this entity
 *   - projectId: UUID (optional) - filter by project
 */
export const GET = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const projectId = searchParams.get('projectId')

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 })
    }

    // If projectId provided, verify access
    if (projectId) {
      const hasAccess = await verifyProjectAccess(supabase, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }
    }

    // RLS will filter relationships based on project access
    let query = supabase
      .from('entity_relationships')
      .select(
        `
      *,
      from_entity:game_entities!from_entity_id(*),
      to_entity:game_entities!to_entity_id(*)
    `
      )
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Relationships API] Error fetching relationships:', error)
      return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
    }

    return NextResponse.json({ relationships: data })
  }
)

/**
 * POST /api/entities/relationships
 * Create a new relationship between entities
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const body = await request.json()

    try {
      const validated = createRelationshipSchema.parse(body)

      // Prevent self-relationships
      if (validated.fromEntityId === validated.toEntityId) {
        return NextResponse.json(
          { error: 'Cannot create relationship from entity to itself' },
          { status: 400 }
        )
      }

      // Verify project access via RLS
      const hasAccess = await verifyProjectAccess(supabase, validated.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }

      const { data, error } = await supabase
        .from('entity_relationships')
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
        console.error('[Relationships API] Error creating relationship:', error)
        return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
      }

      return NextResponse.json({ relationship: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
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
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('id')

    if (!relationshipId) {
      return NextResponse.json({ error: 'relationshipId is required' }, { status: 400 })
    }

    // RLS will ensure user can only delete relationships in their projects
    const { error } = await supabase.from('entity_relationships').delete().eq('id', relationshipId)

    if (error) {
      console.error('[Relationships API] Error deleting relationship:', error)
      return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
)
