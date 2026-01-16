import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

// Entity creation schema
const createEntitySchema = z.object({
  projectId: z.string().uuid(),
  entityType: z.enum(['character', 'location', 'mechanic', 'faction', 'item', 'quest']),
  name: z.string().min(1),
  description: z.string().optional(),
  sourceDomain: z.enum(['storyteller', 'loop-creator', 'interior-designer', 'world-building']),
  sourceEntityId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
})

/**
 * GET /api/entities
 * List entities for a project with optional filtering
 * Query params:
 *   - projectId: UUID (required)
 *   - entityType: character | location | mechanic | faction | item | quest (optional)
 *   - sourceDomain: storyteller | loop-creator | interior-designer | world-building (optional)
 *   - search: string (optional, searches name and description)
 */
export const GET = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const entityType = searchParams.get('entityType')
    const sourceDomain = searchParams.get('sourceDomain')
    const search = searchParams.get('search')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project access via RLS (authenticated client)
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    let query = supabase
      .from('game_entities')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (sourceDomain) {
      query = query.eq('source_domain', sourceDomain)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Entities API] Error fetching entities:', error)
      return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
    }

    return NextResponse.json({ entities: data })
  }
)

/**
 * POST /api/entities
 * Create a new entity
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const body = await request.json()

    try {
      const validated = createEntitySchema.parse(body)

      // Verify project access via RLS
      const hasAccess = await verifyProjectAccess(supabase, validated.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }

      const { data, error } = await supabase
        .from('game_entities')
        .insert({
          project_id: validated.projectId,
          user_id: session.user.id, // Use authenticated user's ID
          entity_type: validated.entityType,
          name: validated.name,
          description: validated.description,
          source_domain: validated.sourceDomain,
          source_entity_id: validated.sourceEntityId,
          metadata: validated.metadata || {},
          tags: validated.tags || [],
          image_url: validated.imageUrl,
          used_in_domains: [validated.sourceDomain],
        })
        .select()
        .single()

      if (error) {
        console.error('[Entities API] Error creating entity:', error)
        return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 })
      }

      return NextResponse.json({ entity: data }, { status: 201 })
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
  { maxRequests: 30, windowMs: 60000 } // 30 entity creates per minute
)
