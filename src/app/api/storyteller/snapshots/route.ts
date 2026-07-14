import { NextRequest, NextResponse } from 'next/server'
import { getUserSession, requireAuth } from '@/shared/auth/auth'
import { verifyBeatAccess, verifyCharacterAccess } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE, DB_UPSERT } from '@/shared/data/constants/db-tables'
import { EmotionalStateDefault, QueryParam } from '@/shared/data/constants/protocol'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

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
      return NextResponse.json({ error: API_ERROR.BEAT_AND_CHARACTER_ID_REQUIRED }, { status: 400 })
    }

    if (!(await verifyBeatAccess(beatId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const { data, error } = await supabase
      .from(DB_TABLE.CHARACTER_STATE_SNAPSHOTS)
      .upsert(
        {
          [DB_COLUMN.BEAT_ID]: beatId,
          [DB_COLUMN.CHARACTER_ID]: characterId,
          [DB_COLUMN.STRESS_LEVEL]: stressLevel ?? 0,
          [DB_COLUMN.EMOTIONAL_STATE]: emotionalState ?? EmotionalStateDefault.Neutral,
          [DB_COLUMN.TRANSFORMATION_PROGRESS]: transformationProgress ?? 0,
          [DB_COLUMN.GOALS]: goals ?? [],
          [DB_COLUMN.FEARS]: fears ?? [],
          [DB_COLUMN.NOTES]: notes ?? null,
        },
        { onConflict: DB_UPSERT.CHARACTER_SNAPSHOT_CHARACTER_BEAT }
      )
      .select()
      .single()

    if (error) {
      console.error(API_LOG_PREFIX.ERROR_SAVING_SNAPSHOT, error)
      return NextResponse.json({ error: API_ERROR.FAILED_SAVE_SNAPSHOT }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(API_LOG_PREFIX.SNAPSHOTS_API_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const beatId = searchParams.get(QueryParam.BeatId)
    const characterId = searchParams.get(QueryParam.CharacterId)

    if (!beatId && !characterId) {
      return NextResponse.json({ error: API_ERROR.BEAT_OR_CHARACTER_ID_REQUIRED }, { status: 400 })
    }

    if (beatId && !(await verifyBeatAccess(beatId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }
    if (characterId && !(await verifyCharacterAccess(characterId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    let query = supabase
      .from(DB_TABLE.CHARACTER_STATE_SNAPSHOTS)
      .select(DB_SELECT.CHARACTER_SNAPSHOT_WITH_RELATIONS)

    if (beatId) query = query.eq(DB_COLUMN.BEAT_ID, beatId)
    if (characterId) query = query.eq(DB_COLUMN.CHARACTER_ID, characterId)

    const { data, error } = await query.order(DB_COLUMN.CREATED_AT, { ascending: true })

    if (error) {
      console.error(API_LOG_PREFIX.ERROR_FETCHING_SNAPSHOTS, error)
      return NextResponse.json({ error: API_ERROR.FAILED_FETCH_SNAPSHOTS }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error(API_LOG_PREFIX.SNAPSHOTS_API_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
