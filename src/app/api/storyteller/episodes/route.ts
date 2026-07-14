import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { ZodError } from 'zod'

import { episodes } from '@/db'
import { requireAuth } from '@/shared/auth/auth'
import { db } from '@/db/client'
import {
  parseCreateStorytellerEpisodeRequest,
} from '@/domains/storyteller/io/storyteller.api'
import {
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
} from '@/domains/storyteller/io/storyteller.dto'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { AuthBypassValue, HttpHeader, QueryParam } from '@/shared/data/constants/protocol'
import { StorytellerEpisodeStatus } from '@/domains/storyteller/core/storyteller-page-wire'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsedQuery = storytellerEpisodesQuerySchema.safeParse({
    projectId: searchParams.get(QueryParam.ProjectId),
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
  }

  const { projectId } = parsedQuery.data

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED_PROJECT_ACCESS }, { status: 403 })
    }

    const projectEpisodes = await db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, projectId))
      .orderBy(asc(episodes.sequence))

    return NextResponse.json(storytellerEpisodesResponseSchema.parse(projectEpisodes))
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODES_FETCH_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_EPISODES }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const bypassHeader = req.headers.get(HttpHeader.BYPASS_AUTH)
    const isSystem = bypassHeader === AuthBypassValue.System

    let session
    if (!isSystem) {
      const authResult = await requireAuth()
      session = authResult.session
      if (!session) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
      }
    }

    const { projectId, title, sequence, masterPrompt, summary } =
      parseCreateStorytellerEpisodeRequest(await req.json())

    if (!isSystem && session) {
      const hasAccess = await verifyProjectAccess(projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED_PROJECT_ACCESS }, { status: 403 })
      }
    }

    const [newEpisode] = await db
      .insert(episodes)
      .values({
        projectId,
        title,
        sequence,
        masterPrompt,
        summary,
        status: StorytellerEpisodeStatus.Planning,
      })
      .returning()

    return NextResponse.json(newEpisode)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_EPISODE_PAYLOAD, details: error.flatten() },
        { status: 400 }
      )
    }

    console.error(API_LOG_PREFIX.EPISODES_CREATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_EPISODE }, { status: 500 })
  }
}
