import { AIModel, AIModelConfig, TileContext } from './types'
import { assembleContextImage } from './contextAssembler'
import { enhancePromptWithStyle } from './styleAnalyzer'
import axios from 'axios'

export class CustomAIModel implements AIModel {
  id = 'custom'
  name = 'Custom API (Banana/Other)'
  description =
    'Connect to a custom Stable Diffusion endpoint (e.g. Banana.dev). Expects SD-compatible payload.'

  validateConfig(config: AIModelConfig): boolean {
    return !!config.baseUrl
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    if (!config.baseUrl) throw new Error('Base URL missing')

    // Enhance prompt
    const neighborList = Object.values(context.neighbors).filter(Boolean)
    const enhancedPrompt = await enhancePromptWithStyle(prompt, neighborList)

    const { imageBlob, maskBlob, cropRect } = await assembleContextImage(context, 1024)

    // Convert blobs to base64 for JSON payload
    const imageBase64 = await this.blobToBase64(imageBlob)
    const maskBase64 = await this.blobToBase64(maskBlob)

    // Generic SD payload structure
    // Adjust this based on the specific custom API requirements
    // This assumes a standard Automatic1111 or similar API structure
    const payload = {
      prompt: enhancedPrompt,
      negative_prompt: 'blurry, low quality, artifacts',
      init_images: [imageBase64],
      mask: maskBase64,
      steps: config.params?.steps || 30,
      cfg_scale: config.params?.cfgScale || 7,
      sampler_name: config.params?.sampler || 'Euler a',
      width: 1024,
      height: 1024,
      mask_blur: 4,
      inpainting_fill: 1, // Original
    }

    try {
      const response = await axios.post(config.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
      })

      // Handle different response formats
      let base64Image = ''
      if (response.data.images && response.data.images[0]) {
        base64Image = response.data.images[0]
      } else if (response.data.image) {
        base64Image = response.data.image
      } else if (response.data.output) {
        // Banana.dev often returns { output: { ... } }
        base64Image = response.data.output
      } else {
        throw new Error('Unknown response format')
      }

      // Ensure it's a data URL
      const dataUrl = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`

      return await this.cropImage(dataUrl, cropRect)
    } catch (error: unknown) {
      console.error('Custom API generation failed', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Custom API failed: ${message}`)
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private async cropImage(
    url: string,
    rect: { x: number; y: number; width: number; height: number }
  ): Promise<string> {
    const img = await this.loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No context')

    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
    return canvas.toDataURL('image/png')
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }
}
