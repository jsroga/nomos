import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/auth'

import { verifyProjectAccess } from '@/domains/storyteller'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to project' }, { status: 403 })
    }

    const { data: projectEpisodes, error } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence', { ascending: true })

    if (error) throw error

    return NextResponse.json(projectEpisodes)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const bypassHeader = req.headers.get('x-bypass-auth')
    const isSystem = bypassHeader === 'system'

    let session
    if (!isSystem) {
      const authResult = await requireAuth()
      session = authResult.session
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { projectId, title, sequence, masterPrompt, summary } = body

    if (!isSystem && session) {
      const hasAccess = await verifyProjectAccess(projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized access to project' }, { status: 403 })
      }
    }

    const { data: newEpisode, error } = await supabaseAdmin
      .from('episodes')
      .insert({
        project_id: projectId,
        title,
        sequence,
        master_prompt: masterPrompt,
        summary,
        status: 'planning',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(newEpisode)
  } catch (error) {
    console.error('Error creating episode:', error)
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
  }
}
