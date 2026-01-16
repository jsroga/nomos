import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import {
  bibleToPrompt,
  bibleToVisualPrompt,
  SeriesBible,
} from '@/domains/storyteller/context/series-bible'
import { ragService } from '@/domains/storyteller/services/rag-service'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller/lib/access-verification'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [project] = await db
      .select({ seriesBible: projects.seriesBible })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const bible = project.seriesBible as SeriesBible

    if (!bible || (!bible.title && !bible.logline && !bible.premise)) {
      return NextResponse.json(
        {
          error:
            'Series Bible not created. Please set up your Story Bible first in the Storyteller section.',
        },
        { status: 400 }
      )
    }

    let summary = bibleToPrompt(bible)
    const worldGenPrompt = bibleToVisualPrompt(bible)

    try {
      const ragResults = await ragService.retrieveByType(
        projectId,
        'world_rule',
        'important world logic and atmosphere',
        3
      )

      if (ragResults.length > 0) {
        summary += '\n\n=== ADDITIONAL CONTEXT (RAG) ===\n'
        ragResults.forEach(r => {
          summary += `- ${r.content}\n`
        })
      }
    } catch (e) {
      console.warn('Failed to fetch RAG context:', e)
    }

    return NextResponse.json({
      summarize: summary,
      worldGenPrompt: worldGenPrompt,
    })
  } catch (error) {
    console.error('Error serving world summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
