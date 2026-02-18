import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters } from '@/domains/storyteller/db/schema'
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
      console.warn('Series Bible not created, returning empty summary')
      // Continue with empty bible effectively
    }

    // Fetch project-level cast so the summary includes character data
    const cast = await db
      .select({ name: characters.name, role: characters.role, description: characters.description })
      .from(characters)
      .where(eq(characters.projectId, projectId))

    const formattedCast = cast.map(c => ({
      ...c,
      description: c.description || undefined,
    }))

    let summary = bibleToPrompt(bible, formattedCast)
    const worldGenPrompt = bibleToVisualPrompt(bible, formattedCast)

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
