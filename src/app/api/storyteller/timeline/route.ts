import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { verifyEpisodeAccess } from '@/domains/storyteller/lib/access-verification'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const episodeId = searchParams.get('episodeId')
    const beatId = searchParams.get('beatId')

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 })
    }

    // Verify episode access
    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

    // Get beats for the episode
    const { data: beats, error: beatsError } = await supabase
      .from('beats')
      .select('*')
      .eq('episode_id', episodeId)
      .order('sequence', { ascending: true })

    if (beatsError) {
      console.error('Error fetching beats:', beatsError)
      return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
    }

    // If a specific beat is selected, get character snapshots
    let snapshots: any[] = []
    if (beatId) {
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('character_state_snapshots')
        .select('*, characters (id, name)')
        .eq('beat_id', beatId)

      if (snapshotError) {
        console.error('Error fetching snapshots:', snapshotError)
      } else if (snapshotData) {
        snapshots = snapshotData.map((s: any) => ({
          characterId: s.character_id,
          characterName: s.characters?.name || 'Unknown',
          stressLevel: s.stress_level || 0,
          emotionalState: s.emotional_state || 'neutral',
          transformationProgress: s.transformation_progress || 0,
          goals: s.goals || [],
          fears: s.fears || [],
        }))
      }
    }

    return NextResponse.json({ beats: beats || [], snapshots })
  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
