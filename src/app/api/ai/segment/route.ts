import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/infrastructure/ai/replicate'

export async function POST(req: NextRequest) {
    try {
        const { image, points, apiKey } = await req.json()

        if (!image || !points) {
            return NextResponse.json({ error: 'Missing image or points' }, { status: 400 })
        }

        // Use provided API key or fallback to env var (if we had one, but user stores it in local storage usually)
        // The user's pattern seems to be storing keys in local storage and sending them?
        // Wait, for Replicate, we might want to use a server-side key if available, or accept one from client.
        // The prompt says "integrate with chosen API".
        // In `RepaintService`, the user stores keys in localStorage.
        // So we should probably accept the key from the client for now to match the pattern, 
        // OR if the user wants to use their own key.
        // However, Replicate key is usually private. 
        // If the app is for the user's own use (local), passing key from client is fine.

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 })
        }

        const client = new ReplicateClient(apiKey)
        const output = await client.segmentObject(image, points)

        return NextResponse.json({ output })
    } catch (error: any) {
        console.error('Segmentation error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
