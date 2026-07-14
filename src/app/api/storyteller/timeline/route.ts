import { NextRequest, NextResponse } from 'next/server'
import { getUserSession, requireAuth } from '@/shared/auth/auth'
import { verifyEpisodeAccess } from '@/domains/storyteller/server'
import { readNumber, readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  StorytellerQueryParam,
  StorytellerUnknownLabel,
} from '@/domains/storyteller/core/storyteller-page-wire'

const DEFAULT_EMOTIONAL_STATE = 'neutral'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const episodeId = searchParams.get(StorytellerQueryParam.EpisodeId)
    const beatId = searchParams.get(StorytellerQueryParam.BeatId)

    if (!episodeId) {
      return NextResponse.json({ error: API_ERROR.EPISODE_ID_REQUIRED }, { status: 400 })
    }

    // Verify episode access
    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    // Get beats for the episode
    const { data: beats, error: beatsError } = await supabase
      .from(DB_TABLE.BEATS)
      .select('*')
      .eq(DB_COLUMN.EPISODE_ID, episodeId)
      .order(DB_COLUMN.SEQUENCE, { ascending: true })

    if (beatsError) {
      console.error(API_LOG_PREFIX.FETCH_BEATS_ERROR, beatsError)
      return NextResponse.json({ error: API_ERROR.FAILED_FETCH_BEATS }, { status: 500 })
    }

    // If a specific beat is selected, get character snapshots
    let snapshots: Array<Record<string, unknown>> = []
    if (beatId) {
      const { data: snapshotData, error: snapshotError } = await supabase
        .from(DB_TABLE.CHARACTER_STATE_SNAPSHOTS)
        .select(DB_SELECT.CHARACTER_SNAPSHOT_WITH_NAME)
        .eq(DB_COLUMN.BEAT_ID, beatId)

      if (snapshotError) {
        console.error(API_LOG_PREFIX.FETCH_SNAPSHOTS_ERROR, snapshotError)
      } else if (snapshotData) {
        snapshots = snapshotData.map(snapshot => {
          const row = recordFromJson(snapshot)
          const character = recordFromJson(row.characters)
          return {
            characterId: row.character_id,
            characterName: readString(character.name) ?? StorytellerUnknownLabel.Unknown,
            stressLevel: readNumber(row.stress_level) ?? 0,
            emotionalState: readString(row.emotional_state) ?? DEFAULT_EMOTIONAL_STATE,
            transformationProgress: readNumber(row.transformation_progress) ?? 0,
            goals: recordArrayFromJson(row.goals),
            fears: recordArrayFromJson(row.fears),
          }
        })
      }
    }

    return NextResponse.json({ beats: beats || [], snapshots })
  } catch (error) {
    console.error(API_LOG_PREFIX.TIMELINE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
