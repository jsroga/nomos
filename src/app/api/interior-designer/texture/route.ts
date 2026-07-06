import { NextRequest, NextResponse } from 'next/server'
import { textureService } from '@/domains/interior-designer/services/TextureService'
import {
  interiorTextureRequestSchema,
  interiorTextureResponseSchema,
  type InteriorTextureResponse,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorTextureResponse | { error: string }>> => {
      const body = await request.json()
      const { prompt, apiKey } = body as { prompt?: string; apiKey?: string }

      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
      }

      if (!apiKey) {
        return NextResponse.json({ error: 'API Key is required' }, { status: 401 })
      }

      const parsedBody = interiorTextureRequestSchema.parse(body)
      const { style, useSemanticSearch, width, height } = parsedBody
      const dims = { width: width || 1024, height: height || 1024 }
      const imageUrl = await textureService.generateTexture(
        prompt,
        apiKey,
        style || 'painterly',
        useSemanticSearch,
        dims
      )

      return NextResponse.json(interiorTextureResponseSchema.parse({ imageUrl }))
    }
  ),
  { maxRequests: 20, windowMs: 60000 }
)
