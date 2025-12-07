export class MeshyClient {
  private apiKey: string
  private baseUrl = 'https://api.meshy.ai/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateModel(imageUrl: string): Promise<string> {
    // Step 1: Initiate Generation (Image to 3D)
    const response = await fetch(`${this.baseUrl}/image-to-3d`, {
      method: 'POST',
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
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Meshy Generation Failed: ${error.message || response.statusText}`)
    }

    const { result: taskId } = await response.json()

    // Step 2: Poll for completion
    return this.pollTask(taskId)
  }

  private async pollTask(taskId: string): Promise<string> {
    const maxRetries = 120 // Meshy can take a bit (2s interval -> 4 mins)
    let attempts = 0

    while (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`${this.baseUrl}/image-to-3d/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) continue

      const data = await response.json()

      if (data.status === 'SUCCEEDED') {
        return data.model_urls.glb // Prefer GLB for web
      } else if (data.status === 'FAILED') {
        throw new Error(`Meshy Task Failed: ${data.task_error?.message || 'Unknown error'}`)
      }

      attempts++
    }

    throw new Error('Meshy Task Timed Out')
  }

  async retextureModel(
    modelUrlOrBase64: string,
    prompt: string,
    aiModel: 'latest' | 'meshy-4' | 'meshy-5' = 'latest'
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

    const textureBaseUrl = 'https://api.meshy.ai/openapi/v1/retexture'

    const payload: any = {
      model_url: modelUrlOrBase64,
      text_style_prompt: prompt,
      ai_model: aiModel,
      enable_original_uv: true,
      enable_pbr: true
    }

    const response = await fetch(textureBaseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let message = response.statusText
      try {
        const json = JSON.parse(errorText)
        message = json.message || message
      } catch { }
      throw new Error(`Meshy Retexture Start Failed: ${message}`)
    }

    const { result: taskId } = await response.json()

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

      if (data.status === 'SUCCEEDED') {
        return data.model_urls.glb
      } else if (data.status === 'FAILED') {
        const errorMsg = data.task_error?.message || 'Unknown error'
        throw new Error(`Meshy Retexture Task Failed: ${errorMsg}`)
      }

      attempts++
    }

    throw new Error('Meshy Retexture Task Timed Out')
  }
}
