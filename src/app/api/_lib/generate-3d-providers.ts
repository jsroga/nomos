import { NextResponse } from 'next/server'
import fs from 'fs'
import { sanitizePath, isValidProjectId, safeFetch, secureLog } from '@/shared/auth/security'
import { MeshyModelFormat, MeshyResponseField, Hyper3dResponseField } from '@/shared/ai/constants/meshy'
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

const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 60

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

export function resolveProjectImageDataUrl(imageUrl: string): string | NextResponse {
  if (!imageUrl.startsWith(Generate3dPathPrefix.Projects)) {
    return imageUrl
  }

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
  return `${UrlScheme.Data}${mimeType};${BufferEncoding.Base64},${base64}`
}

async function pollMeshyTask(taskId: string, apiKey: string): Promise<Record<string, unknown>> {
  let status = MeshyTaskStatus.Pending
  let result: Record<string, unknown> | null = null
  let attempts = 0

  while (
    status !== MeshyTaskStatus.Succeeded &&
    status !== MeshyTaskStatus.Failed &&
    attempts < MAX_POLL_ATTEMPTS
  ) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const statusResponse = await safeFetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
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
  return result
}

export async function generateModelWithMeshy(
  finalImageUrl: string,
  apiKey: string,
): Promise<string> {
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
    const err = recordFromJson(await createResponse.json())
    const message = readStringField(err, MeshyResponseField.Message) ?? createResponse.statusText
    throw new Error(`Meshy API error: ${message}`)
  }

  const createBody = recordFromJson(await createResponse.json())
  const taskId = readStringField(createBody, MeshyResponseField.Result)
  if (!taskId) {
    throw new Error(API_ERROR.FAILED_CHECK_TASK_STATUS)
  }

  const result = await pollMeshyTask(taskId, apiKey)
  const modelUrls = recordFromJson(result[MeshyResponseField.ModelUrls])
  return (
    readStringField(modelUrls, MeshyModelFormat.Glb) ||
    readStringField(result, MeshyResponseField.ModelUrl) ||
    ''
  )
}

async function pollHyper3dTask(
  subscriptionKey: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  let status = Hyper3dTaskStatus.Processing
  let result: Record<string, unknown> | null = null
  let attempts = 0

  while (status === Hyper3dTaskStatus.Processing && attempts < MAX_POLL_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const statusResponse = await safeFetch(
      `https://api.hyper3d.ai/v1/rodin/status?subscription_key=${subscriptionKey}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
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
  return result
}

export async function generateModelWithHyper3d(
  finalImageUrl: string,
  apiKey: string,
): Promise<string> {
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
    const err = recordFromJson(await response.json())
    const message = readStringField(err, MeshyResponseField.Message) ?? response.statusText
    throw new Error(`Hyper3D API error: ${message}`)
  }

  const body = recordFromJson(await response.json())
  const subscriptionKey = readStringField(body, Hyper3dResponseField.SubscriptionKey)
  if (!subscriptionKey) {
    throw new Error(API_ERROR.FAILED_CHECK_HYPER3D_STATUS)
  }

  const result = await pollHyper3dTask(subscriptionKey, apiKey)
  const output = recordFromJson(result[MeshyResponseField.Output])
  return (
    readStringField(output, MeshyResponseField.ModelUrl) ||
    readStringField(result, MeshyResponseField.ModelUrl) ||
    ''
  )
}

export async function generateModelUrl(
  provider: string,
  finalImageUrl: string,
  apiKey: string,
): Promise<string | NextResponse> {
  if (provider === ModelProvider.Meshy) {
    return generateModelWithMeshy(finalImageUrl, apiKey)
  }
  if (provider === ModelProvider.Hyper3d) {
    return generateModelWithHyper3d(finalImageUrl, apiKey)
  }
  return NextResponse.json({ error: API_ERROR.UNKNOWN_PROVIDER }, { status: 400 })
}
