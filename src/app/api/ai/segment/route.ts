import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/shared/ai/replicate'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session: _session }: AuthenticatedRequest) => {
    const { image, points, apiKey } = await request.json()

    if (!image || !points) {
      return NextResponse.json({ error: API_ERROR.MISSING_IMAGE_OR_POINTS }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_API_KEY }, { status: 401 })
    }

    const client = new ReplicateClient(apiKey)
    const output = await client.segmentObject(image, points)

    return NextResponse.json({ output })
  }),
  { maxRequests: 30, windowMs: 60000 }
)
