import { NextRequest, NextResponse } from 'next/server'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/repaint
 * Server-side Gemini inpainting for the repaint tool.
 * Keeps the GOOGLE_API_KEY on the server instead of exposing it to the client.
 */
export const POST = withRateLimit(
  withAuth<any>(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, base64Image, maskBase64, prompt, styleReferenceUrls } = body

    if (!projectId || !base64Image || !maskBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, base64Image, maskBase64' },
        { status: 400 }
      )
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not configured on server' }, { status: 500 })
    }

    const model = 'gemini-3-pro-image-preview'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const styleRefHint = styleReferenceUrls?.length
      ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
      : ''

    const finalPrompt = (prompt || 'High quality, detailed, seamless blend') + styleRefHint

    const payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: 'image/png', data: base64Image } },
            { inline_data: { mime_type: 'image/png', data: maskBase64 } },
            {
              text: 'Edit the first image using the second image as a mask. The white area in the mask indicates where to edit. Seamlessly blend the changes.',
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini inpainting error:', errorText)
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]

    if (!candidate) {
      return NextResponse.json({ error: 'No candidates returned from Gemini' }, { status: 502 })
    }

    if (candidate.finishReason === 'SAFETY') {
      return NextResponse.json({ error: 'Generation blocked by safety filters' }, { status: 422 })
    }

    const parts = candidate.content?.parts
    if (!parts?.length) {
      return NextResponse.json({ error: 'No content parts returned' }, { status: 502 })
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

    return NextResponse.json({ error: 'No image found in Gemini response' }, { status: 502 })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
