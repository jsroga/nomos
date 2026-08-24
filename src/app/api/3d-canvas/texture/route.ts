import { NextRequest, NextResponse } from 'next/server'
import { textureService } from '@/domains/3d-canvas/services/texture-service'
import {
  interiorTextureRequestSchema,
  interiorTextureResponseSchema,
  type InteriorTextureResponse,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import { DEFAULT_TEXTURE_STYLE } from '@/domains/3d-canvas/constants/texture-defaults'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session: _session }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorTextureResponse | { error: string }>> => {
      // auth-scope: session-existence-only — generates a texture from a posted prompt.
      const body = await request.json()
      const parsedBody = interiorTextureRequestSchema.parse(body)
      const { prompt, apiKey, style, useSemanticSearch, width, height } = parsedBody

      if (!prompt) {
        return NextResponse.json({ error: API_ERROR.PROMPT_REQUIRED }, { status: 400 })
      }

      if (!apiKey) {
        return NextResponse.json({ error: API_ERROR.API_KEY_IS_REQUIRED }, { status: 401 })
      }

      const dims = { width: width || 1024, height: height || 1024 }
      const imageUrl = await textureService.generateTexture(
        prompt,
        apiKey,
        style || DEFAULT_TEXTURE_STYLE,
        useSemanticSearch,
        dims
      )

      return NextResponse.json(interiorTextureResponseSchema.parse({ imageUrl }))
    }
  ),
  { maxRequests: 20, windowMs: 60000 }
)
