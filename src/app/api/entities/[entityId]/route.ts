import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Entity update schema
const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  usedInDomains: z.array(z.string()).optional(),
})

/**
 * GET /api/entities/[entityId]
 * Get a single entity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const { data, error } = await supabase
      .from('game_entities')
      .select('*')
      .eq('id', params.entityId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ entity: data })
  } catch (error) {
    console.error('[Entities API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/entities/[entityId]
 * Update an entity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const body = await request.json()
    const validated = updateEntitySchema.parse(body)

    const updates: any = { updated_at: new Date().toISOString() }
    
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.description !== undefined) updates.description = validated.description
    if (validated.metadata !== undefined) updates.metadata = validated.metadata
    if (validated.tags !== undefined) updates.tags = validated.tags
    if (validated.imageUrl !== undefined) updates.image_url = validated.imageUrl
    if (validated.usedInDomains !== undefined) updates.used_in_domains = validated.usedInDomains

    const { data, error } = await supabase
      .from('game_entities')
      .update(updates)
      .eq('id', params.entityId)
      .select()
      .single()

    if (error) {
      console.error('[Entities API] Error updating entity:', error)
      return NextResponse.json(
        { error: 'Failed to update entity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entity: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Entities API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/entities/[entityId]
 * Delete an entity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const { error } = await supabase
      .from('game_entities')
      .delete()
      .eq('id', params.entityId)

    if (error) {
      console.error('[Entities API] Error deleting entity:', error)
      return NextResponse.json(
        { error: 'Failed to delete entity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Entities API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

