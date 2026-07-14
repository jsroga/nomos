import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'

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
    _request: NextRequest,
    { session: _session, supabase }: AuthenticatedRequest,
    context?: { params: Record<string, string> }
  ) => {
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
    }

    const entityId = context?.params?.entityId

    if (!entityId) {
      return NextResponse.json({ error: API_ERROR.ENTITY_ID_REQUIRED }, { status: 400 })
    }

    // RLS will ensure user can only see their own entities
    const { data, error } = await supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .select('*')
      .eq(DB_COLUMN.ID, entityId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: API_ERROR.ENTITY_NOT_FOUND }, { status: 404 })
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
      { session: _session, supabase }: AuthenticatedRequest,
      context?: { params: Record<string, string> }
    ) => {
      if (!supabase) {
        return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
      }

      const entityId = context?.params?.entityId

      if (!entityId) {
        return NextResponse.json({ error: API_ERROR.ENTITY_ID_REQUIRED }, { status: 400 })
      }

      const body = await request.json()

      try {
        const validated = updateEntitySchema.parse(body)

        const updates: Record<string, unknown> = { [DB_COLUMN.UPDATED_AT]: new Date().toISOString() }

        if (validated.name !== undefined) updates[DB_COLUMN.NAME] = validated.name
        if (validated.description !== undefined) updates.description = validated.description
        if (validated.metadata !== undefined) updates.metadata = validated.metadata
        if (validated.tags !== undefined) updates.tags = validated.tags
        if (validated.imageUrl !== undefined) updates[DB_COLUMN.IMAGE_URL] = validated.imageUrl
        if (validated.usedInDomains !== undefined) {
          updates[DB_COLUMN.USED_IN_DOMAINS] = validated.usedInDomains
        }

        // RLS will ensure user can only update their own entities
        const { data, error } = await supabase
          .from(DB_TABLE.GAME_ENTITIES)
          .update(updates)
          .eq(DB_COLUMN.ID, entityId)
          .select()
          .single()

        if (error) {
          console.error(API_LOG_PREFIX.ENTITIES_UPDATE_ERROR, error)
          return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_ENTITY }, { status: 500 })
        }

        if (!data) {
          return NextResponse.json({ error: API_ERROR.ENTITY_ACCESS_DENIED }, { status: 404 })
        }

        return NextResponse.json({ entity: data })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: API_ERROR.INVALID_REQUEST, details: error.errors },
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
    _request: NextRequest,
    { session: _session, supabase }: AuthenticatedRequest,
    context?: { params: Record<string, string> }
  ) => {
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
    }

    const entityId = context?.params?.entityId

    if (!entityId) {
      return NextResponse.json({ error: API_ERROR.ENTITY_ID_REQUIRED }, { status: 400 })
    }

    // RLS will ensure user can only delete their own entities
    const { error } = await supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .delete()
      .eq(DB_COLUMN.ID, entityId)

    if (error) {
      console.error(API_LOG_PREFIX.ENTITIES_DELETE_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_DELETE_ENTITY }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
)
