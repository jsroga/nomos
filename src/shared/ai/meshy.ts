import {
  MeshyAiModelId,
  MeshyApiBaseUrl,
  MeshyApiPath,
  MeshyErrorMessage,
  MeshyLogEmoji,
  MeshyLogLevel,
  MeshyLogMessage,
  MeshyLogPrefix,
  MeshyModelFormat,
} from '@/shared/ai/constants/meshy'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { readJsonBody } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  CentralityFallback,
  HttpMethod,
  MeshyTaskStatus,
  UrlScheme,
} from '@/shared/data/constants/protocol'

const log = (level: MeshyLogLevel, message: string, data?: unknown) => {
  const prefix =
    level === MeshyLogLevel.Error
      ? MeshyLogEmoji.Error
      : level === MeshyLogLevel.Warn
        ? MeshyLogEmoji.Warning
        : MeshyLogEmoji.Success
  console.log(`${prefix} ${MeshyLogPrefix.Client} ${message}`, data ? JSON.stringify(data, null, 2) : '')
}

export class MeshyClient {
  private apiKey: string
  private baseUrl = MeshyApiBaseUrl.V2
  // Store current task ID for external access
  public currentTaskId: string | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateModel(imageUrl: string): Promise<string> {
    // Step 1: Initiate Generation (Image to 3D)
    const response = await fetch(`${this.baseUrl}${MeshyApiPath.ImageTo3d}`, {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: true,
      }),
    })

    if (!response.ok) {
      const error = recordFromJson(await readJsonBody(response, { message: response.statusText }))
      throw new Error(
        `Meshy Generation Failed: ${readString(error.message) ?? response.statusText}`
      )
    }

    const { result: taskId } = await response.json()
    this.currentTaskId = taskId
    log(MeshyLogLevel.Info, MeshyLogMessage.ImageTo3dTaskCreated, { taskId })

    // Step 2: Poll for completion
    return this.pollTask(taskId)
  }

  private async pollTask(taskId: string): Promise<string> {
    const maxRetries = 120 // Meshy can take a bit (2s interval -> 4 mins)
    let attempts = 0

    while (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`${this.baseUrl}${MeshyApiPath.ImageTo3d}/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) continue

      const data = await response.json()

      if (data.status === MeshyTaskStatus.Succeeded) {
        return data.model_urls[MeshyModelFormat.Glb] // Prefer GLB for web
      } else if (data.status === MeshyTaskStatus.Failed) {
        throw new Error(
          `Meshy Task Failed: ${data.task_error?.message || API_ERROR.UNKNOWN_ERROR}`
        )
      }

      attempts++
    }

    throw new Error(MeshyErrorMessage.TaskTimedOut)
  }

  async retextureModel(
    modelUrlOrBase64: string,
    prompt: string,
    aiModel: `${MeshyAiModelId}` = MeshyAiModelId.Latest,
    styleImageUrl?: string
  ): Promise<string> {
    // Determine if input is valid URL or needs to be treated as Base64 Data URI
    // Meshy API expects "model_url" to be either a public URL or a Data URI.
    // If our input is a raw base64 string without prefix, we might need to add it, but usually we pass Data URI.
    // Let's assume the caller passes a valid URL or a Data URI.

    // Step 1: Create Retexture Task
    // Note: The /openapi/v1/retexture endpoint is what we want.
    // The current baseUrl in the class is 'https://api.meshy.ai/v2' which seems to be for image-to-3d (legacy v2?).
    // The docs say `https://api.meshy.ai/openapi/v1/retexture`.
    // I will use the absolute URL for retexture to be safe.

    const textureBaseUrl = MeshyApiBaseUrl.RetextureV1

    const payload: Record<string, unknown> = {
      model_url: modelUrlOrBase64,
      text_style_prompt: prompt,
      ai_model: aiModel,
      enable_original_uv: false,
      enable_pbr: true,
    }

    // Add style reference image if provided (from project settings)
    if (styleImageUrl) {
      payload.image_style_url = styleImageUrl
      log(MeshyLogLevel.Info, MeshyLogMessage.UsingStyleReferenceImage, { styleImageUrl })
    }

    log(MeshyLogLevel.Info, MeshyLogMessage.RetextureRequest, {
      url: textureBaseUrl,
      prompt,
      aiModel,
      styleImageUrl: styleImageUrl || CentralityFallback.None,
      modelUrlLength: modelUrlOrBase64.length,
      isDataUri: modelUrlOrBase64.startsWith(UrlScheme.Data),
      isHttpUrl: modelUrlOrBase64.startsWith(UrlScheme.Http),
    })

    const response = await fetch(textureBaseUrl, {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let message = response.statusText

      log(MeshyLogLevel.Error, MeshyLogMessage.RetextureApiError, {
        statusCode: response.status,
        statusText: response.statusText,
        errorResponse: errorText,
      })

      try {
        const json = JSON.parse(errorText)
        message = json.message || message
      } catch {
        // Ignore JSON parse errors, use default message
      }
      throw new Error(`Meshy Retexture Start Failed: ${message}`)
    }

    const responseData = await response.json()
    const { result: taskId } = responseData
    this.currentTaskId = taskId

    log(MeshyLogLevel.Info, MeshyLogMessage.RetextureTaskCreated, { taskId })

    // Step 2: Poll for completion
    return this.pollRetextureTask(taskId, textureBaseUrl)
  }

  private async pollRetextureTask(taskId: string, baseUrl: string): Promise<string> {
    const maxRetries = 180 // 6 minutes (2s interval)
    let attempts = 0

    while (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`${baseUrl}/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) continue

      const data = await response.json()

      if (data.status === MeshyTaskStatus.Succeeded) {
        return data.model_urls[MeshyModelFormat.Glb]
      } else if (data.status === MeshyTaskStatus.Failed) {
        const errorMsg = data.task_error?.message || API_ERROR.UNKNOWN_ERROR
        throw new Error(`Meshy Retexture Task Failed: ${errorMsg}`)
      }

      attempts++
    }

    throw new Error(MeshyErrorMessage.RetextureTaskTimedOut)
  }
}
