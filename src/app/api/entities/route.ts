import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Entity creation schema
const createEntitySchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const entityType = searchParams.get('entityType')
    const sourceDomain = searchParams.get('sourceDomain')
    const search = searchParams.get('search')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to fetch entities' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entities: data })
  } catch (error) {
    console.error('[Entities API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/entities
 * Create a new entity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createEntitySchema.parse(body)

    const { data, error } = await supabase
      .from('game_entities')
      .insert({
        project_id: validated.projectId,
        user_id: validated.userId,
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
      return NextResponse.json(
        { error: 'Failed to create entity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entity: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Entities API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

