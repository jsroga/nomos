import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { generateMidjourneyUpscaledImage } from '@/shared/ai/apiframe'
import { MIDJOURNEY_VERSION } from '@/shared/ai/constants/apiframe'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
    const body = await request.json()
    const { imageUrl, imageBase64, prompt, apiKey, styleReferenceUrls } = body

    if ((!imageUrl && !imageBase64) || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPSCALE_PARAMS }, { status: 400 })
    }

    console.log(API_LOG_PREFIX.MJ_STARTING_UPSCALE, !!imageBase64, API_LOG_PREFIX.MJ_HAS_URL, !!imageUrl)

    const srefParam =
      Array.isArray(styleReferenceUrls) && styleReferenceUrls.length > 0
        ? ` --sref ${styleReferenceUrls.join(' ')}`
        : ''

    const promptText =
      `${imageUrl ? imageUrl + ' ' : ''}${prompt || ''} --v ${MIDJOURNEY_VERSION} --q 2 --s 250${srefParam}`.trim()

    console.log(API_LOG_PREFIX.MJ_WAITING_IMAGINE)
    const result = await generateMidjourneyUpscaledImage(promptText, apiKey, { index: 1 })

    console.log(API_LOG_PREFIX.MJ_UPSCALE_COMPLETED, result.imageUrl)

    return NextResponse.json({
      url: result.imageUrl,
      taskId: result.upsampleJobId,
      originalTaskId: result.imagineJobId,
      gridUrl: result.gridUrl,
    })
  }),
  { maxRequests: 3, windowMs: 60000 }
)
