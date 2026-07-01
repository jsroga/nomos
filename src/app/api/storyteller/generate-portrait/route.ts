import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, verifyProjectAccess } from '@/domains/storyteller'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePortrait } from '@/trigger/generate-portrait'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'
import { resolveStyleReferenceUrls } from '@/config/style-presets'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { prompt, projectId, characterId, apiKey: clientApiKey } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const effectiveCharacterId = characterId || `temp-${Date.now()}`

    const apiKey = clientApiKey || process.env.LEGNEXT_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'LegNext API key not provided',
          message: 'Please configure your LegNext API key in Settings',
        },
        { status: 401 }
      )
    }

    // Fetch project style references (preset or custom URLs)
    let styleReferenceUrls: string[] = []
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
      if (project && project.length > 0) {
        styleReferenceUrls = resolveStyleReferenceUrls(project[0])
      }
    } catch (error) {
      console.error('Failed to fetch project style references:', error)
    }

    const handle = await tasks.trigger<typeof generatePortrait>('generate-portrait', {
      prompt,
      projectId,
      characterId: effectiveCharacterId,
      apiKey,
      styleReferenceUrls,
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
      characterId: effectiveCharacterId,
      status: 'queued',
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
