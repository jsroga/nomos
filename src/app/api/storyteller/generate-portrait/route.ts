import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { prompt, projectId, apiKey: clientApiKey } = body

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        // Get API key from request body (client-side config) or environment variable as fallback
        const apiKey = clientApiKey || process.env.COMET_API_KEY

        if (!apiKey) {
            console.warn('Comet API key not provided')
            // Return a placeholder if no key
            return NextResponse.json({
                url: 'https://placehold.co/1024x1024/png?text=No+API+Key',
                message: 'Please configure your Comet API key in Settings',
            })
        }

        // Fetch project style references if projectId provided
        let styleReferenceUrls: string[] = []
        if (projectId) {
            try {
                const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)

                if (project && project.length > 0) {
                    styleReferenceUrls = (project[0].styleReferenceUrls as any) || []
                }
            } catch (error) {
                console.error('Failed to fetch project style references:', error)
            }
        }

        // Fallback to hardcoded style reference if no project refs
        if (styleReferenceUrls.length === 0) {
            styleReferenceUrls = ['https://s.mj.run/6YNmncnG-Io'] // Default professional portrait style
        }

        // Build --sref parameter from URLs
        const srefParam = styleReferenceUrls.map(url => url).join(' ')

        // Submit imagine task to Comet API
        const submitResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                botType: 'MID_JOURNEY',
                prompt: `portrait of ${prompt}, professional headshot, high quality, detailed --ar 1:1 --sref ${srefParam}`,
                accountFilter: {
                    modes: ['FAST'], // Use FAST mode for quicker generation
                },
            }),
        })

        const submitData = await submitResponse.json()

        if (submitData.code !== 1) {
            throw new Error(submitData.description || 'Failed to submit imagine task')
        }

        const taskId = submitData.result

        // Poll for completion (max 60 seconds)
        const maxAttempts = 60
        let attempts = 0

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

            const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            })

            const fetchData = await fetchResponse.json()

            if (fetchData.code === 1 && fetchData.result) {
                const status = fetchData.result.status

                if (status === 'SUCCESS') {
                    // Return the image URL
                    return NextResponse.json({
                        url: fetchData.result.imageUrl,
                        taskId: taskId,
                    })
                } else if (status === 'FAILED') {
                    throw new Error('Image generation failed')
                }
                // If PROCESSING or IN_QUEUE, continue polling
            }

            attempts++
        }

        // Timeout - return task ID for client-side polling if needed
        return NextResponse.json({
            url: null,
            taskId: taskId,
            message: 'Generation in progress, please wait...',
        })
    } catch (error) {
        console.error('Error generating portrait:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate portrait',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
