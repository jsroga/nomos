import { NextRequest, NextResponse } from 'next/server'
import type { AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  REPAINT_DEFAULT_PROMPT,
  REPAINT_STYLE_REF_PREFIX,
  RepaintUploadPrefix,
} from '@/shared/data/constants/repaint-gemini'
import { editApiframeImage } from '@/shared/ai/apiframe'
import { storageService } from '@/shared/data/storage/storage-service'
import { BufferEncoding, ContentType, StringSeparator, UrlScheme } from '@/shared/data/constants/protocol'
import { getErrorMessage } from '@/shared/errors/error-utils'

interface RepaintBody {
  projectId?: string
  base64Image?: string
  maskBase64?: string
  prompt?: string
  styleReferenceUrls?: string[]
}

function toDataUrl(base64: string): string {
  if (base64.startsWith(UrlScheme.Data)) return base64
  return `${UrlScheme.Data}${ContentType.Png};${BufferEncoding.Base64},${base64}`
}

async function uploadRepaintAsset(prefix: string, base64: string): Promise<string> {
  const { v4: uuidv4 } = await import('uuid')
  const filename = `${prefix}_${uuidv4()}.png`
  const url = await storageService.uploadPublicImage(filename, toDataUrl(base64))
  if (!url) {
    throw new Error(`Failed to upload ${prefix} for Apiframe edit`)
  }
  return url
}

export async function handleRepaintRequest(
  request: NextRequest,
  { supabase }: AuthenticatedRequest
): Promise<NextResponse> {
  const body: RepaintBody = await request.json()
  const { projectId, base64Image, maskBase64, prompt, styleReferenceUrls } = body

  if (!projectId || !base64Image || !maskBase64) {
    return NextResponse.json({ error: API_ERROR.MISSING_REPAINT_FIELDS }, { status: 400 })
  }

  const hasAccess = await verifyProjectAccess(supabase, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
  }

  const apiKey = process.env.APIFRAME_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
      { status: 500 }
    )
  }

  try {
    return await callApiframeRepaint({
      apiKey,
      base64Image,
      maskBase64,
      prompt,
      styleReferenceUrls,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.APIFRAME_EDIT_ERROR, getErrorMessage(error))
    return NextResponse.json(
      { error: `Apiframe edit error: ${getErrorMessage(error)}` },
      { status: 502 }
    )
  }
}

async function callApiframeRepaint(input: {
  apiKey: string
  base64Image: string
  maskBase64: string
  prompt?: string
  styleReferenceUrls?: string[]
}): Promise<NextResponse> {
  const styleRefHint = input.styleReferenceUrls?.length
    ? `${REPAINT_STYLE_REF_PREFIX}${input.styleReferenceUrls.join(StringSeparator.CommaSpace)}.`
    : ''
  const finalPrompt = (input.prompt || REPAINT_DEFAULT_PROMPT) + styleRefHint

  const [imageUrl, maskUrl] = await Promise.all([
    uploadRepaintAsset(RepaintUploadPrefix.Image, input.base64Image),
    uploadRepaintAsset(RepaintUploadPrefix.Mask, input.maskBase64),
  ])

  const result = await editApiframeImage({
    apiKey: input.apiKey,
    imageUrl,
    maskUrl,
    prompt: finalPrompt,
    maxAttempts: 90,
  })

  const response = await fetch(result.imageUrl)
  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to download Apiframe edit result: ${response.status}` },
      { status: 502 }
    )
  }

  const imageBase64 = Buffer.from(await response.arrayBuffer()).toString(BufferEncoding.Base64)
  return NextResponse.json({ imageBase64 })
}
