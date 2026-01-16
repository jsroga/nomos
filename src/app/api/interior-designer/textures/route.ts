import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/infrastructure/ai/replicate'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const { prompt } = await request.json()

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
  }),
  { maxRequests: 20, windowMs: 60000 }
)
