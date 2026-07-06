import { NextRequest, NextResponse } from 'next/server'
import { withAuth, verifyProjectAccess, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { Database } from '@/shared/data/storage/database.types'

type TileUpdate = Database['public']['Tables']['tiles']['Update']

export const POST = withAuth<any>(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { projectId, x, y, upscaledUrl } = await request.json()

    if (!projectId || x === undefined || y === undefined || !upscaledUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Update tile using authenticated client (RLS enforced)
    const updates: TileUpdate = { image_filename: upscaledUrl }

    const { error } = await supabase
      .from('tiles')
      .update(updates)
      .eq('project_id', projectId)
      .eq('x', x)
      .eq('y', y)

    if (error) {
      console.error('Failed to update tile:', error)
      return NextResponse.json({ error: 'Failed to update tile in database' }, { status: 500 })
    }

    return NextResponse.json({ success: true, filename: upscaledUrl })
  }
)
