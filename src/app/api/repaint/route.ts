import { NextRequest, NextResponse } from 'next/server'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  GeminiFinishReason,
  GeminiResponseModality,
  REPAINT_DEFAULT_PROMPT,
  REPAINT_MASK_INSTRUCTION,
  REPAINT_STYLE_REF_PREFIX,
} from '@/shared/data/constants/repaint-gemini'
import { ContentType, GoogleModelId, HttpMethod, StringSeparator } from '@/shared/data/constants/protocol'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

/**
 * POST /api/repaint
 * Server-side Gemini inpainting for the repaint tool.
 */
export const POST = withRateLimit(
  withAuth<any>(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, base64Image, maskBase64, prompt, styleReferenceUrls } = body

    if (!projectId || !base64Image || !maskBase64) {
      return NextResponse.json({ error: API_ERROR.MISSING_REPAINT_FIELDS }, { status: 400 })
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: API_ERROR.GOOGLE_API_KEY_NOT_CONFIGURED_SERVER },
        { status: 500 }
      )
    }

    const model = GoogleModelId.Gemini3ProImagePreview
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const styleRefHint = styleReferenceUrls?.length
      ? `${REPAINT_STYLE_REF_PREFIX}${styleReferenceUrls.join(StringSeparator.CommaSpace)}.`
      : ''

    const finalPrompt = (prompt || REPAINT_DEFAULT_PROMPT) + styleRefHint

    const payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: ContentType.Png, data: base64Image } },
            { inline_data: { mime_type: ContentType.Png, data: maskBase64 } },
            { text: REPAINT_MASK_INSTRUCTION },
          ],
        },
      ],
      generationConfig: {
        responseModalities: [GeminiResponseModality.Image, GeminiResponseModality.Text],
      },
    }

    const response = await fetch(url, {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(API_LOG_PREFIX.GEMINI_INPAINTING_ERROR, errorText)
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]

    if (!candidate) {
      return NextResponse.json({ error: API_ERROR.NO_CANDIDATES_GEMINI }, { status: 502 })
    }

    if (candidate.finishReason === GeminiFinishReason.Safety) {
      return NextResponse.json({ error: API_ERROR.GENERATION_BLOCKED_SAFETY }, { status: 422 })
    }

    const parts = candidate.content?.parts
    if (!parts?.length) {
      return NextResponse.json({ error: API_ERROR.NO_CONTENT_PARTS_GEMINI }, { status: 502 })
    }

    const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)
    if (imagePart) {
      const inlineData = imagePart.inline_data || imagePart.inlineData
      return NextResponse.json({ imageBase64: inlineData.data })
    }

    const textPart = parts.find((p: any) => p.text)
    if (textPart) {
      return NextResponse.json(
        { error: `Gemini returned text instead of image: ${textPart.text.substring(0, 100)}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ error: API_ERROR.NO_IMAGE_GEMINI }, { status: 502 })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
