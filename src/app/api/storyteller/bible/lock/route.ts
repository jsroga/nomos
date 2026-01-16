/**
 * Bible Lock API
 *
 * POST /api/storyteller/bible/lock
 *
 * Allows central users to lock/unlock the Series Bible
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isCentralUser } from '@/lib/bible-permissions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user email from request body (since we're on server side)
    const body = await request.json()
    const { projectId, action, userEmail } = body as {
      projectId: string
      action: 'lock' | 'unlock'
      userEmail?: string
    }

    // For now, we'll trust the client-provided email
    // In production, you'd verify this via JWT or session

    if (!isCentralUser(userEmail)) {
      return NextResponse.json(
        { error: 'Only central users can lock/unlock the Bible' },
        { status: 403 }
      )
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (action !== 'lock' && action !== 'unlock') {
      return NextResponse.json({ error: 'Action must be "lock" or "unlock"' }, { status: 400 })
    }

    console.log(`[Bible Lock API] ${action} Bible for project ${projectId} by ${userEmail}`)

    // Update the Bible lock status
    const updates: any = {
      is_locked: action === 'lock',
      locked_by: action === 'lock' ? userEmail : null,
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
      lockedBy: action === 'lock' ? userEmail : null,
      lockedAt: action === 'lock' ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('[Bible Lock API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update Bible lock status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/storyteller/bible/lock
 *
 * Get Bible lock status for a project
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch Bible lock status
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
      {
        error: 'Failed to get Bible lock status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
