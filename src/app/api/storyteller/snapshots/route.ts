import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import {
  verifyBeatAccess,
  verifyCharacterAccess,
} from '@/domains/storyteller/lib/access-verification'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // Verify beat access
    if (!(await verifyBeatAccess(beatId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

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
        { onConflict: 'character_id,beat_id' }
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

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const beatId = searchParams.get('beatId')
    const characterId = searchParams.get('characterId')

    if (!beatId && !characterId) {
      return NextResponse.json({ error: 'beatId or characterId is required' }, { status: 400 })
    }

    // Verify access
    if (beatId && !(await verifyBeatAccess(beatId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (characterId && !(await verifyCharacterAccess(characterId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    let query = supabase.from('character_state_snapshots').select(`
      *,
      characters (id, name),
      beats (id, sequence, logline)
    `)

    if (beatId) query = query.eq('beat_id', beatId)
    if (characterId) query = query.eq('character_id', characterId)

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
