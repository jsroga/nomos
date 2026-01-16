/**
 * Bible Lock API
 *
 * POST /api/storyteller/bible/lock - Lock/unlock the Series Bible
 * GET /api/storyteller/bible/lock - Get Bible lock status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { isCentralUser } from '@/lib/bible-permissions'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller/lib/access-verification'

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, action } = body as {
      projectId: string
      action: 'lock' | 'unlock'
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Check if user is a central user
    if (!isCentralUser(session.user.email)) {
      return NextResponse.json({ error: 'Only central users can lock/unlock the Bible' }, { status: 403 })
    }

    if (action !== 'lock' && action !== 'unlock') {
      return NextResponse.json({ error: 'Action must be "lock" or "unlock"' }, { status: 400 })
    }

    console.log(`[Bible Lock API] ${action} Bible for project ${projectId} by ${session.user.email}`)

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const updates: any = {
      is_locked: action === 'lock',
      locked_by: action === 'lock' ? session.user.email : null,
      locked_at: action === 'lock' ? new Date().toISOString() : null,
    }

    const { error: updateError } = await supabase
      .from('series_bibles')
      .update(updates)
      .eq('project_id', projectId)

    if (updateError) {
      console.error('[Bible Lock API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update lock status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action,
      lockedBy: action === 'lock' ? session.user.email : null,
      lockedAt: action === 'lock' ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('[Bible Lock API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update Bible lock status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('series_bibles')
      .select('is_locked, locked_by, locked_at')
      .eq('project_id', projectId)
      .single()

    if (error) {
      console.error('[Bible Lock API] Fetch error:', error)
      return NextResponse.json({ isLocked: false, lockedBy: null, lockedAt: null }, { status: 200 })
    }

    return NextResponse.json({
      isLocked: data?.is_locked || false,
      lockedBy: data?.locked_by || null,
      lockedAt: data?.locked_at || null,
    })
  } catch (error) {
    console.error('[Bible Lock API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get Bible lock status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
