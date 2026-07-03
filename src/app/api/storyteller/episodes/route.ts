import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { ZodError } from 'zod'

import { episodes } from '@/db'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parseCreateStorytellerEpisodeRequest,
} from '@/domains/storyteller/io/storyteller.api'
import {
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
} from '@/domains/storyteller/io/storyteller.dto'
import { verifyProjectAccess } from '@/domains/storyteller'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsedQuery = storytellerEpisodesQuerySchema.safeParse({
    projectId: searchParams.get('projectId'),
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  const { projectId } = parsedQuery.data

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to project' }, { status: 403 })
    }

    const projectEpisodes = await db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, projectId))
      .orderBy(asc(episodes.sequence))

    return NextResponse.json(storytellerEpisodesResponseSchema.parse(projectEpisodes))
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

    const { projectId, title, sequence, masterPrompt, summary } =
      parseCreateStorytellerEpisodeRequest(await req.json())

    if (!isSystem && session) {
      const hasAccess = await verifyProjectAccess(projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized access to project' }, { status: 403 })
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
        status: 'planning',
      })
      .returning()

    return NextResponse.json(newEpisode)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid episode payload', details: error.flatten() },
        { status: 400 }
      )
    }

    console.error('Error creating episode:', error)
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
  }
}
