import { NextResponse } from 'next/server'
import { ReplicateClient } from '@/infrastructure/ai/replicate'

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 })
    }

    const client = new ReplicateClient(apiKey)
    const textureUrl = await client.generateTexture(prompt)

    return NextResponse.json({ url: textureUrl })
  } catch (error) {
    console.error('Texture generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate texture' }, { status: 500 })
  }
}
