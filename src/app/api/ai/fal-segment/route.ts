import { NextRequest, NextResponse } from 'next/server'
import { FalClient, SamParams } from '@/infrastructure/ai/fal'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'

// Set max duration for longer processing (App Router)
export const maxDuration = 60

/**
 * POST /api/ai/fal-segment
 * Segment objects in an image using FAL AI
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    // Parse body manually to handle large payloads
    const body = await request.text()

    // Log raw body size for debugging
    console.log('[fal/segment] Raw body size:', {
      bytes: body.length,
      mb: (body.length / 1024 / 1024).toFixed(2),
      userId: session.user.id,
    })

    const { image, box, apiKey, textPrompt, samParams } = JSON.parse(body)

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    if (!box) {
      return NextResponse.json({ error: 'Bounding box required' }, { status: 400 })
    }

    // Validate and log image data
    const imageSize = image?.length || 0
    const expectedPrefix = 'data:image/png;base64,'
    const hasValidPrefix = image?.startsWith(expectedPrefix)
    const base64Data = hasValidPrefix ? image.slice(expectedPrefix.length) : ''
    const isValidBase64Length = base64Data.length > 0 && base64Data.length % 4 === 0

    console.log('[fal/segment] Request validation:', {
      imageSize,
      imageSizeMB: (imageSize / 1024 / 1024).toFixed(2),
      box,
      hasTextPrompt: !!textPrompt,
      hasValidPrefix,
      base64DataLength: base64Data.length,
      isValidBase64Length,
      imagePrefix: image?.substring(0, 60),
      imageEnding: image?.slice(-30),
    })

    if (!hasValidPrefix || !isValidBase64Length) {
      console.error('[fal/segment] WARNING: Image data may be malformed or truncated!')
    }

    const client = new FalClient(apiKey)
    const output = await client.segmentObject(image, box, textPrompt, samParams as SamParams)

    return NextResponse.json({ output })
  }),
  { maxRequests: 30, windowMs: 60000 } // 30 segmentation requests per minute
)
