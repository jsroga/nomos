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
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: true
      })
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
          'Authorization': `Bearer ${this.apiKey}`
        }
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
}

