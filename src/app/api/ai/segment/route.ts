import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/infrastructure/ai/replicate'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const { image, points, apiKey } = await request.json()

    if (!image || !points) {
      return NextResponse.json({ error: 'Missing image or points' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 })
    }

    const client = new ReplicateClient(apiKey)
    const output = await client.segmentObject(image, points)

    return NextResponse.json({ output })
  }),
  { maxRequests: 30, windowMs: 60000 }
)
