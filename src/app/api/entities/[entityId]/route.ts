import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

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
export const GET = withAuth(
  async (
    request: NextRequest,
    { session, supabase }: AuthenticatedRequest,
    context?: { params: Record<string, string> }
  ) => {
    const entityId = context?.params?.entityId

    if (!entityId) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 })
    }

    // RLS will ensure user can only see their own entities
    const { data, error } = await supabase
      .from('game_entities')
      .select('*')
      .eq('id', entityId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    return NextResponse.json({ entity: data })
  }
)

/**
 * PATCH /api/entities/[entityId]
 * Update an entity
 */
export const PATCH = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session, supabase }: AuthenticatedRequest,
      context?: { params: Record<string, string> }
    ) => {
      const entityId = context?.params?.entityId

      if (!entityId) {
        return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 })
      }

      const body = await request.json()

      try {
        const validated = updateEntitySchema.parse(body)

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

        if (validated.name !== undefined) updates.name = validated.name
        if (validated.description !== undefined) updates.description = validated.description
        if (validated.metadata !== undefined) updates.metadata = validated.metadata
        if (validated.tags !== undefined) updates.tags = validated.tags
        if (validated.imageUrl !== undefined) updates.image_url = validated.imageUrl
        if (validated.usedInDomains !== undefined) updates.used_in_domains = validated.usedInDomains

        // RLS will ensure user can only update their own entities
        const { data, error } = await supabase
          .from('game_entities')
          .update(updates)
          .eq('id', entityId)
          .select()
          .single()

        if (error) {
          console.error('[Entities API] Error updating entity:', error)
          return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 })
        }

        if (!data) {
          return NextResponse.json({ error: 'Entity not found or access denied' }, { status: 404 })
        }

        return NextResponse.json({ entity: data })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid request data', details: error.errors },
            { status: 400 }
          )
        }
        throw error
      }
    }
  ),
  { maxRequests: 60, windowMs: 60000 }
)

/**
 * DELETE /api/entities/[entityId]
 * Delete an entity
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    { session, supabase }: AuthenticatedRequest,
    context?: { params: Record<string, string> }
  ) => {
    const entityId = context?.params?.entityId

    if (!entityId) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 })
    }

    // RLS will ensure user can only delete their own entities
    const { error } = await supabase.from('game_entities').delete().eq('id', entityId)

    if (error) {
      console.error('[Entities API] Error deleting entity:', error)
      return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
)
