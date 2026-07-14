import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { sanitizePath, isValidProjectId, safeFetch, secureLog } from '@/shared/auth/security'
import { MeshyModelFormat, MeshyResponseField } from '@/shared/ai/constants/meshy'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { recordFromJson } from '@/shared/data/deep-merge'
import {
  BufferEncoding,
  ContentType,
  FsDirectory,
  Generate3dPathPrefix,
  HttpMethod,
  Hyper3dTaskStatus,
  ImageFileExtension,
  ImageMimeType,
  JsonImageUrlType,
  MeshyTaskStatus,
  ModelProvider,
  SecureLogMessage,
  UrlScheme,
} from '@/shared/data/constants/protocol'

function readMeshyTaskStatus(value: unknown): MeshyTaskStatus {
  if (value === MeshyTaskStatus.Succeeded) return MeshyTaskStatus.Succeeded
  if (value === MeshyTaskStatus.Failed) return MeshyTaskStatus.Failed
  return MeshyTaskStatus.Pending
}

function readHyper3dTaskStatus(value: unknown): Hyper3dTaskStatus {
  if (value === Hyper3dTaskStatus.Completed) return Hyper3dTaskStatus.Completed
  if (value === Hyper3dTaskStatus.Failed) return Hyper3dTaskStatus.Failed
  return Hyper3dTaskStatus.Processing
}

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

export const POST = withRateLimit(
  withAuth<any>(async (request: NextRequest, {}: AuthenticatedRequest) => {
    const { assetId, imageUrl, provider, apiKey } = await request.json()

    if (!assetId || !imageUrl || !provider || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    let finalImageUrl = imageUrl

    if (imageUrl.startsWith(Generate3dPathPrefix.Projects)) {
      const pathParts = imageUrl.split('/')
      const projectId = pathParts[2]

      if (!projectId || !isValidProjectId(projectId)) {
        return NextResponse.json({ error: API_ERROR.INVALID_PROJECT_ID_IN_PATH }, { status: 400 })
      }

      const relativePath = imageUrl.replace(Generate3dPathPrefix.Projects, '')
      const { safe, sanitizedPath, error } = sanitizePath(relativePath, FsDirectory.Projects)

      if (!safe || !sanitizedPath) {
        secureLog.warn(SecureLogMessage.PathTraversalBlocked, { imageUrl, error })
        return NextResponse.json({ error: API_ERROR.INVALID_FILE_PATH }, { status: 400 })
      }

      if (!fs.existsSync(sanitizedPath)) {
        return NextResponse.json({ error: API_ERROR.IMAGE_FILE_NOT_FOUND }, { status: 404 })
      }

      const fileBuffer = fs.readFileSync(sanitizedPath)
      const base64 = fileBuffer.toString(BufferEncoding.Base64)
      const mimeType = imageUrl.endsWith(ImageFileExtension.Png)
        ? ImageMimeType.Png
        : ImageMimeType.Jpeg
      finalImageUrl = `${UrlScheme.Data}${mimeType};${BufferEncoding.Base64},${base64}`
    }

    let modelUrl = ''

    if (provider === ModelProvider.Meshy) {
      const createResponse = await safeFetch('https://api.meshy.ai/v1/image-to-3d', {
        method: HttpMethod.Post,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': ContentType.Json,
        },
        body: JSON.stringify({
          image_url: finalImageUrl,
          enable_pbr: true,
        }),
      })

      if (!createResponse.ok) {
        const err = await createResponse.json()
        throw new Error(`Meshy API error: ${err.message || createResponse.statusText}`)
      }

      const { result: taskId } = await createResponse.json()

      let status = MeshyTaskStatus.Pending
      let result: Record<string, unknown> | null = null
      const maxAttempts = 60
      let attempts = 0

      while (
        status !== MeshyTaskStatus.Succeeded &&
        status !== MeshyTaskStatus.Failed &&
        attempts < maxAttempts
      ) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        const statusResponse = await safeFetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error(API_ERROR.FAILED_CHECK_TASK_STATUS)
        }

        result = recordFromJson(await statusResponse.json())
        status = readMeshyTaskStatus(result.status)
        attempts++
      }

      if (status === MeshyTaskStatus.Failed) {
        throw new Error(API_ERROR.MESHY_GENERATION_FAILED)
      }

      if (status !== MeshyTaskStatus.Succeeded || !result) {
        throw new Error(API_ERROR.MESHY_GENERATION_TIMEOUT)
      }

      const modelUrls = recordFromJson(result[MeshyResponseField.ModelUrls])
      modelUrl =
        readStringField(modelUrls, MeshyModelFormat.Glb) ||
        readStringField(result, MeshyResponseField.ModelUrl) ||
        ''
    } else if (provider === ModelProvider.Hyper3d) {
      const response = await safeFetch('https://api.hyper3d.ai/v1/rodin', {
        method: HttpMethod.Post,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': ContentType.Json,
        },
        body: JSON.stringify({
          images: [
            {
              type: finalImageUrl.startsWith(UrlScheme.Data)
                ? JsonImageUrlType.Base64
                : JsonImageUrlType.Url,
              url: finalImageUrl,
            },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(`Hyper3D API error: ${err.message || response.statusText}`)
      }

      const { subscription_key } = await response.json()

      let status = Hyper3dTaskStatus.Processing
      let result: Record<string, unknown> | null = null
      const maxAttempts = 60
      let attempts = 0

      while (status === Hyper3dTaskStatus.Processing && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        const statusResponse = await safeFetch(
          `https://api.hyper3d.ai/v1/rodin/status?subscription_key=${subscription_key}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        )

        if (!statusResponse.ok) {
          throw new Error(API_ERROR.FAILED_CHECK_HYPER3D_STATUS)
        }

        result = recordFromJson(await statusResponse.json())
        status = readHyper3dTaskStatus(result.status)
        attempts++
      }

      if (status === Hyper3dTaskStatus.Failed) {
        throw new Error(API_ERROR.HYPER3D_GENERATION_FAILED)
      }

      if (status !== Hyper3dTaskStatus.Completed || !result) {
        throw new Error(API_ERROR.HYPER3D_GENERATION_TIMEOUT)
      }

      const output = recordFromJson(result[MeshyResponseField.Output])
      modelUrl =
        readStringField(output, MeshyResponseField.ModelUrl) ||
        readStringField(result, MeshyResponseField.ModelUrl) ||
        ''
    } else {
      return NextResponse.json({ error: API_ERROR.UNKNOWN_PROVIDER }, { status: 400 })
    }

    return NextResponse.json({ success: true, modelUrl })
  }),
  { maxRequests: 5, windowMs: 60000 }
)
