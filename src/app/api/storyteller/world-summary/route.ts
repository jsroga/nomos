
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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get('projectId')

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        // 1. Fetch Project Bible
        const [project] = await db
            .select({ seriesBible: projects.seriesBible })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1)

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const bible = project.seriesBible as SeriesBible

        // Check if bible has been created (has at least title or logline or premise)
        if (!bible || (!bible.title && !bible.logline && !bible.premise)) {
            return NextResponse.json(
                { error: 'Series Bible not created. Please set up your Story Bible first in the Storyteller section.' },
                { status: 400 }
            )
        }

        // 2. Generate Summaries
        let summary = bibleToPrompt(bible)
        const worldGenPrompt = bibleToVisualPrompt(bible)

        // 3. (Optional) Enhance with RAG for deep lore
        // Retrieve extra world rules or context that might not be in the structured bible yet
        // or provides more color.
        try {
            const ragResults = await ragService.retrieveByType(
                projectId,
                'world_rule',
                'important world logic and atmosphere',
                3
            )

            if (ragResults.length > 0) {
                summary += '\n\n=== ADDITIONAL CONTEXT (RAG) ===\n'
                ragResults.forEach((r) => {
                    summary += `- ${r.content}\n`
                })
            }
        } catch (e) {
            console.warn('Failed to fetch RAG context:', e)
            // Continue without RAG if it fails
        }

        return NextResponse.json({
            summarize: summary,
            worldGenPrompt: worldGenPrompt,
        })
    } catch (error) {
        console.error('Error serving world summary:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
