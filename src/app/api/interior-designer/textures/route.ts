import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/infrastructure/ai/replicate'
import {
  interiorTexturesRequestSchema,
  interiorTexturesResponseSchema,
  type InteriorTexturesResponse,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorTexturesResponse | { error: string }>> => {
      const parsedBody = interiorTexturesRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { prompt } = parsedBody.data

      const apiKey = process.env.REPLICATE_API_TOKEN
      if (!apiKey) {
        return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 })
      }

      const client = new ReplicateClient(apiKey)
      const textureUrl = await client.generateTexture(prompt)

      return NextResponse.json(interiorTexturesResponseSchema.parse({ url: textureUrl }))
    }
  ),
  { maxRequests: 20, windowMs: 60000 }
)
