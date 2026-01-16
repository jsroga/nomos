import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Relationship creation schema
const createRelationshipSchema = z.object({
  projectId: z.string().uuid(),
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  relationshipType: z.enum(['uses', 'located_in', 'conflicts_with', 'allies_with', 'owns', 'part_of']),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/entities/relationships
 * Get relationships for entities
 * Query params:
 *   - entityId: UUID (required) - get all relationships for this entity
 *   - projectId: UUID (optional) - filter by project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const projectId = searchParams.get('projectId')

    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('entity_relationships')
      .select(`
        *,
        from_entity:game_entities!from_entity_id(*),
        to_entity:game_entities!to_entity_id(*)
      `)
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Relationships API] Error fetching relationships:', error)
      return NextResponse.json(
        { error: 'Failed to fetch relationships' },
        { status: 500 }
      )
    }

    return NextResponse.json({ relationships: data })
  } catch (error) {
    console.error('[Relationships API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/entities/relationships
 * Create a new relationship between entities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createRelationshipSchema.parse(body)

    // Prevent self-relationships
    if (validated.fromEntityId === validated.toEntityId) {
      return NextResponse.json(
        { error: 'Cannot create relationship from entity to itself' },
        { status: 400 }
      )
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
      .select(`
        *,
        from_entity:game_entities!from_entity_id(*),
        to_entity:game_entities!to_entity_id(*)
      `)
      .single()

    if (error) {
      console.error('[Relationships API] Error creating relationship:', error)
      return NextResponse.json(
        { error: 'Failed to create relationship' },
        { status: 500 }
      )
    }

    return NextResponse.json({ relationship: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Relationships API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/entities/relationships/[relationshipId]
 * Delete a relationship
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('id')

    if (!relationshipId) {
      return NextResponse.json(
        { error: 'relationshipId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('entity_relationships')
      .delete()
      .eq('id', relationshipId)

    if (error) {
      console.error('[Relationships API] Error deleting relationship:', error)
      return NextResponse.json(
        { error: 'Failed to delete relationship' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Relationships API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

