import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      beatId,
      characterId,
      stressLevel,
      emotionalState,
      transformationProgress,
      goals,
      fears,
      notes,
    } = body

    if (!beatId || !characterId) {
      return NextResponse.json({ error: 'beatId and characterId are required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Upsert the snapshot (update if exists, insert if not)
    const { data, error } = await supabase
      .from('character_state_snapshots')
      .upsert(
        {
          beat_id: beatId,
          character_id: characterId,
          stress_level: stressLevel ?? 0,
          emotional_state: emotionalState ?? 'neutral',
          transformation_progress: transformationProgress ?? 0,
          goals: goals ?? [],
          fears: fears ?? [],
          notes: notes ?? null,
        },
        {
          onConflict: 'character_id,beat_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving snapshot:', error)
      return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Snapshots API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const beatId = searchParams.get('beatId')
    const characterId = searchParams.get('characterId')

    if (!beatId && !characterId) {
      return NextResponse.json({ error: 'beatId or characterId is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    let query = supabase.from('character_state_snapshots').select(`
                *,
                characters (id, name),
                beats (id, sequence, logline)
            `)

    if (beatId) {
      query = query.eq('beat_id', beatId)
    }
    if (characterId) {
      query = query.eq('character_id', characterId)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching snapshots:', error)
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Snapshots API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
