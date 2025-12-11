import { NextRequest, NextResponse } from 'next/server'
import { uploadAssetTask } from '@/trigger/upload-asset'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { projectId, assetId, modelFilename } = body

        if (!projectId || !assetId || !modelFilename) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, assetId, modelFilename' },
                { status: 400 }
            )
        }

        // Trigger the upload task
        const handle = await uploadAssetTask.trigger({
            projectId,
            assetId,
            modelFilename,
        })

        return NextResponse.json({ runId: handle.id })
    } catch (error: any) {
        console.error('Error triggering upload task:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
