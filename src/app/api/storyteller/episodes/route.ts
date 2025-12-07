import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  try {
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
    const body = await req.json()
    const { projectId, title, sequence, masterPrompt, summary } = body

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
