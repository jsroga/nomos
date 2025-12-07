
import { retextureModelTask } from '@/trigger/retexture-model' // Verify import path
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { modelUrlOrBase64, prompt, assetId, projectId, apiKey } = await req.json()

        if (!modelUrlOrBase64 || !prompt || !projectId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Trigger the task
        const handle = await tasks.trigger<typeof retextureModelTask>('retexture-model', {
            modelBase64: modelUrlOrBase64,
            prompt,
            assetId: assetId || 'temp-asset',
            projectId,
            apiKey: apiKey || process.env.MESHY_API_KEY, // Allow client to pass key or use server env
        })

        return NextResponse.json({ runId: handle.id })
    } catch (error: any) {
        console.error('Failed to trigger retexture:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
