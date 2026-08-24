import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  generateModelUrl,
  resolveProjectImageDataUrl,
} from '@/app/api/_lib/generate-3d-providers'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
    // auth-scope: session-existence-only — generates from a posted image; assetId is validated but unused.
    const { assetId, imageUrl, provider, apiKey } = await request.json()

    if (!assetId || !imageUrl || !provider || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    const resolvedImage = resolveProjectImageDataUrl(imageUrl)
    if (resolvedImage instanceof NextResponse) {
      return resolvedImage
    }

    const modelResult = await generateModelUrl(provider, resolvedImage, apiKey)
    if (modelResult instanceof NextResponse) {
      return modelResult
    }

    return NextResponse.json({ success: true, modelUrl: modelResult })
  }),
  { maxRequests: 5, windowMs: 60000 },
)
