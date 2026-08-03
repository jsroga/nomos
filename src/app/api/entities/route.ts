import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { AppModuleId, GameEntityKind } from '@/shared/data/constants/protocol'
import { GameEntityQueryParam } from '@/shared/data/constants/game-entities-wire'

// Entity creation schema
const createEntitySchema = z.object({
  projectId: z.string().uuid(),
  entityType: z.nativeEnum(GameEntityKind),
  name: z.string().min(1),
  description: z.string().optional(),
  sourceDomain: z.nativeEnum(AppModuleId),
  sourceEntityId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
})

/**
 * GET /api/entities
 * List entities for a project with optional filtering
 */
export const GET = withAuth(
  async (request: NextRequest, { session: _session, supabase }: AuthenticatedRequest) => {
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get(GameEntityQueryParam.ProjectId)
    const entityType = searchParams.get(GameEntityQueryParam.EntityType)
    const sourceDomain = searchParams.get(GameEntityQueryParam.SourceDomain)
    const search = searchParams.get(GameEntityQueryParam.Search)

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_QUERY_REQUIRED }, { status: 400 })
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    let query = supabase
      .from(DB_TABLE.GAME_ENTITIES)
      .select('*')
      .eq(DB_COLUMN.PROJECT_ID, projectId)
      .order(DB_COLUMN.CREATED_AT, { ascending: false })

    if (entityType) {
      query = query.eq(DB_COLUMN.ENTITY_TYPE, entityType)
    }

    if (sourceDomain) {
      query = query.eq(DB_COLUMN.SOURCE_DOMAIN, sourceDomain)
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.,()\\]/g, '')
      query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error(API_LOG_PREFIX.ENTITIES_FETCH_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_FETCH_ENTITIES }, { status: 500 })
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
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
    }

    const body = await request.json()

    try {
      const validated = createEntitySchema.parse(body)

      const hasAccess = await verifyProjectAccess(supabase, validated.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }

      const { data, error } = await supabase
        .from(DB_TABLE.GAME_ENTITIES)
        .insert({
          [DB_COLUMN.PROJECT_ID]: validated.projectId,
          [DB_COLUMN.USER_ID]: session.user.id,
          [DB_COLUMN.ENTITY_TYPE]: validated.entityType,
          [DB_COLUMN.NAME]: validated.name,
          description: validated.description,
          [DB_COLUMN.SOURCE_DOMAIN]: validated.sourceDomain,
          [DB_COLUMN.SOURCE_ENTITY_ID]: validated.sourceEntityId,
          metadata: validated.metadata || {},
          tags: validated.tags || [],
          [DB_COLUMN.IMAGE_URL]: validated.imageUrl,
          [DB_COLUMN.USED_IN_DOMAINS]: [validated.sourceDomain],
        })
        .select()
        .single()

      if (error) {
        console.error(API_LOG_PREFIX.ENTITIES_CREATE_ERROR, error)
        return NextResponse.json({ error: API_ERROR.FAILED_CREATE_ENTITY }, { status: 500 })
      }

      return NextResponse.json({ entity: data }, { status: 201 })
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
