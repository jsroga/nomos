import { NextResponse } from 'next/server'
import { generateMoodboardTask } from '@/trigger/generate-moodboard'
import { tasks } from '@trigger.dev/sdk/v3'

export async function POST(req: Request) {
    try {
        const { projectId, worldDescription } = await req.json()

        // We need prompts. If we don't have them in the request, we should probably generate them here or 
        // rely on the previous agent step.
        // For now, let's assume we want to construct them or use defaults, or fetch from DB if the agent saved them.
        // Simpler: Just use the world description as the base prompt for now. 

        // Wait! The user requirement was: "Our agentic system should be able to generate such prompt for MJ."
        // The PremiseArchitect generates `imagePrompts`. We should fetch the seriesBible and use those.

        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: project } = await supabase
            .from('projects')
            .select('series_bible')
            .eq('id', projectId)
            .single()

        const bible = project?.series_bible || {}
        const prompts = bible.imagePrompts || {}

        const worldPrompt = prompts.world || worldDescription || "A cinematic shot of the world environment."
        const scenePrompts = [
            prompts.scene1 || "A close-up detail of the world.",
            prompts.scene2 || "An action shot in the world."
        ]

        const handle = await tasks.trigger<typeof generateMoodboardTask>('generate-moodboard', {
            projectId,
            worldPrompt,
            scenePrompts,
            mjApiKey: process.env.COMET_API_KEY!
        })

        return NextResponse.json({ success: true, taskId: handle.id })
    } catch (error) {
        console.error("Trigger error:", error)
        return NextResponse.json({ error: 'Failed to trigger moodboard' }, { status: 500 })
    }
}
