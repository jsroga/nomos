import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/db/client'
import { beats, episodes, projects } from '@/db'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import type { generateCombinedStoryboard } from '@/domains/storyteller/tasks/generate-combined-storyboard.task'
import {
  beatsWithImageUrl,
  type CombinedStoryboardBeat,
} from '@/domains/storyteller/tasks/generate-combined-storyboard-helpers'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { resolveApiframeApiKey } from '@/shared/ai/image-model-env'
import {
  resolveStoryboardVideoLook,
  resolveStoryboardVideoModel,
  StoryboardVideoRequestField,
} from '@/shared/ai/storyboard-video-env'
import { recordFromJson } from '@/shared/data/json-guards'

function mapBeatRow(row: {
  logline: string
  visualHook: string | null
  content: string | null
  imagePrompt: string | null
  imageUrl: string | null
}): CombinedStoryboardBeat {
  const logline = row.logline.trim()
  const visualHook = (row.visualHook ?? row.content ?? '').trim()
  const imagePrompt = (row.imagePrompt ?? '').trim()
  const imageUrl = (row.imageUrl ?? '').trim()
  return {
    logline,
    visualHook: visualHook.length > 0 ? visualHook : undefined,
    imagePrompt: imagePrompt.length > 0 ? imagePrompt : undefined,
    imageUrl: imageUrl.length > 0 ? imageUrl : undefined,
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ episodeId: string }> },
) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const { episodeId } = params
    const apiKey = resolveApiframeApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED }, { status: 500 })
    }

    const episodeData = await db
      .select({
        projectId: projects.id,
      })
      .from(episodes)
      .innerJoin(projects, eq(episodes.projectId, projects.id))
      .where(eq(episodes.id, episodeId))
      .execute()
      .then(rows => rows[0])

    if (!episodeData) {
      return NextResponse.json({ error: API_ERROR.EPISODE_PROJECT_NOT_FOUND }, { status: 404 })
    }

    if (!(await tryProjectScope(episodeData.projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const beatRows = await db
      .select({
        logline: beats.logline,
        visualHook: beats.visualHook,
        content: beats.content,
        imagePrompt: beats.imagePrompt,
        imageUrl: beats.imageUrl,
      })
      .from(beats)
      .where(eq(beats.episodeId, episodeId))
      .orderBy(asc(beats.sequence))

    const allBeats = beatRows.map(mapBeatRow)
    if (allBeats.length === 0) {
      return NextResponse.json({ error: API_ERROR.BEATS_REQUIRED }, { status: 400 })
    }

    const mappedBeats = beatsWithImageUrl(allBeats)
    if (mappedBeats.length === 0) {
      return NextResponse.json({ error: API_ERROR.BEAT_IMAGES_REQUIRED }, { status: 400 })
    }

    console.log(`${API_LOG_PREFIX.COMBINED_STORYBOARD_TRIGGER} ${episodeId}`)

    const body = recordFromJson(await req.json().catch(() => ({})))
    const model = resolveStoryboardVideoModel(
      undefined,
      body[StoryboardVideoRequestField.Model],
    )
    const look = resolveStoryboardVideoLook(body[StoryboardVideoRequestField.Look])

    const handle = await triggerOwnedRun<typeof generateCombinedStoryboard>(
      TRIGGER_TASK_ID.GENERATE_COMBINED_STORYBOARD,
      {
        episodeId,
        projectId: episodeData.projectId,
        beats: mappedBeats,
        model,
        look,
      },
    )

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.COMBINED_STORYBOARD_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
