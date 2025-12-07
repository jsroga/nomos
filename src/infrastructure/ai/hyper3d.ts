export class Hyper3DClient {
  private apiKey: string
  private baseUrl = 'https://api.hyper3d.ai/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateModel(imageUrl: string, prompt?: string): Promise<string> {
    // Step 1: Initiate Generation
    const response = await fetch(`${this.baseUrl}/image-to-3d`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: prompt || 'High quality 3D model',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Hyper3D Generation Failed: ${error.message || response.statusText}`)
    }

    const { task_id } = await response.json()

    // Step 2: Poll for completion
    return this.pollTask(task_id)
  }

  private async pollTask(taskId: string): Promise<string> {
    const maxRetries = 60 // 2 minutes roughly (2s interval)
    let attempts = 0

    while (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) continue

      const data = await response.json()

      if (data.status === 'SUCCEEDED') {
        return data.model_url // Assuming this returns the GLB url
      } else if (data.status === 'FAILED') {
        throw new Error(`Hyper3D Task Failed: ${data.error}`)
      }

      attempts++
    }

    throw new Error('Hyper3D Task Timed Out')
  }
}
