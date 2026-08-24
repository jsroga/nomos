import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import { Database } from '@/shared/data/storage/database.types'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'

type TileUpdate = Database['public']['Tables']['tiles']['Update']

export const POST = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { projectId, x, y, upscaledUrl } = await request.json()

    if (!projectId || x === undefined || y === undefined || !upscaledUrl) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Update tile using authenticated client (RLS enforced)
    const updates: TileUpdate = { image_filename: upscaledUrl }

    const { error } = await supabase
      .from(DB_TABLE.TILES)
      .update(updates)
      .eq(DB_COLUMN.PROJECT_ID, projectId)
      .eq('x', x)
      .eq('y', y)

    if (error) {
      console.error(API_LOG_PREFIX.TILE_UPDATE_FAILED, error)
      return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_TILE }, { status: 500 })
    }

    return NextResponse.json({ success: true, filename: upscaledUrl })
  }
)
