import { NextRequest, NextResponse } from 'next/server'
import { FalClient, SamParams } from '@/infrastructure/ai/fal'

export async function POST(request: NextRequest) {
    try {
        const { image, box, apiKey, textPrompt, samParams } = await request.json()

        if (!apiKey) {
            return NextResponse.json({ error: 'API key required' }, { status: 400 })
        }

        if (!box) {
            return NextResponse.json({ error: 'Bounding box required' }, { status: 400 })
        }

        const client = new FalClient(apiKey)
        const output = await client.segmentObject(image, box, textPrompt, samParams as SamParams)

        return NextResponse.json({ output })
    } catch (error: any) {
        console.error('[fal/segment] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Segmentation failed' },
            { status: 500 }
        )
    }
}
