import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePortrait } from '@/trigger/generate-portrait' // Import type for type-safety if possible, or just string

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, projectId, characterId, apiKey: clientApiKey } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // characterId is optional - use temp ID for new characters
    const effectiveCharacterId = characterId || `temp-${Date.now()}`

    // Get API key from request body (client-side config) or environment variable as fallback
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

    // Fetch project style references
    let styleReferenceUrls: string[] = []
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)

      if (project && project.length > 0) {
        styleReferenceUrls = (project[0].styleReferenceUrls as any) || []
      }
    } catch (error) {
      console.error('Failed to fetch project style references:', error)
    }

    // Trigger the background task
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
  } catch (error) {
    console.error('Error triggering portrait generation:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
