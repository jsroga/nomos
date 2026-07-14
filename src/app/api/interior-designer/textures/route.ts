import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient } from '@/shared/ai/replicate'
import {
  interiorTexturesRequestSchema,
  interiorTexturesResponseSchema,
  type InteriorTexturesResponse,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session: _session }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorTexturesResponse | { error: string }>> => {
      const parsedBody = interiorTexturesRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { prompt } = parsedBody.data

      const apiKey = process.env.REPLICATE_API_TOKEN
      if (!apiKey) {
        return NextResponse.json({ error: API_ERROR.REPLICATE_TOKEN_NOT_CONFIGURED }, { status: 500 })
      }

      const client = new ReplicateClient(apiKey)
      const textureUrl = await client.generateTexture(prompt)

      return NextResponse.json(interiorTexturesResponseSchema.parse({ url: textureUrl }))
    }
  ),
  { maxRequests: 20, windowMs: 60000 }
)
