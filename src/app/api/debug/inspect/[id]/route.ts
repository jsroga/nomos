import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects } from '@/db'
import { eq } from 'drizzle-orm'
import { API_ERROR } from '@/shared/data/constants/api-errors'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, params.id),
            with: {
                seriesBibleTable: true,
                storyPlanTable: true,
            },
        })

        if (!project) {
            return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND })
        }

        return NextResponse.json({
            project_name: project.name,
            project_legacy_bible: project.seriesBible,
            project_legacy_plan: project.storyPlan,
            table_bible_content: project.seriesBibleTable?.content,
            table_plan_content: project.storyPlanTable?.content,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack })
    }
}
