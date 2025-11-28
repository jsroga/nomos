import { AIModel, AIModelConfig, TileContext } from './types'
import OpenAI from 'openai'
import { assembleContextImage } from './contextAssembler'
import { enhancePromptWithStyle } from './styleAnalyzer'

export class OpenAIModel implements AIModel {
  id = 'openai'
  name = 'OpenAI DALL-E'
  description = 'Uses DALL-E 2 for generation and outpainting. Requires API Key.'

  validateConfig(config: AIModelConfig): boolean {
    return !!config.apiKey
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error('API Key missing')

    const openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      timeout: 60000, // 60 second timeout
      maxRetries: 2, // Retry on failures
    })

    const hasNeighbors = Object.values(context.neighbors).some(Boolean)

    if (hasNeighbors) {
      // Outpainting Mode
      try {
        const { imageBlob, maskBlob, cropRect } = await assembleContextImage(context, 1024)

        // Validate blob sizes (OpenAI has a 4MB limit per file)
        if (imageBlob.size > 4 * 1024 * 1024) {
          throw new Error('Image too large. Try with fewer neighbors.')
        }

        const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' })
        const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' })

        console.log(
          `Sending edit request - Image: ${(imageBlob.size / 1024).toFixed(1)}KB, Mask: ${(maskBlob.size / 1024).toFixed(1)}KB`
        )

        // Enhance prompt with style from neighbors
        const neighborList = Object.values(context.neighbors).filter(Boolean)
        const enhancedPrompt = await enhancePromptWithStyle(prompt, neighborList)
        console.log(`Original prompt: "${prompt}"`)
        console.log(`Enhanced prompt: "${enhancedPrompt}"`)

        const response = await openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        })

        const b64 = response.data?.[0]?.b64_json
        if (!b64) throw new Error('No image generated')
        const dataUrl = `data:image/png;base64,${b64}`

        // Crop the result
        return await this.cropImage(dataUrl, cropRect)
      } catch (error: any) {
        console.error('Edit request failed:', error)
        throw new Error(`OpenAI Edit failed: ${error.message || 'Unknown error'}`)
      }
    } else {
      // Standard Generation Mode
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024', // DALL-E 3 only supports 1024x1024
        response_format: 'b64_json',
      })

      const b64 = response.data[0].b64_json
      if (!b64) throw new Error('No image generated')
      const dataUrl = `data:image/png;base64,${b64}`

      // DALL-E 3 generates 1024x1024. Our tiles are 512x512.
      // We should resize it down to 512x512 to match our grid.
      return await this.resizeImage(dataUrl, 512, 512)
    }
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

    // Draw only the slice we want
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)

    return canvas.toDataURL('image/png')
  }

  private async resizeImage(url: string, width: number, height: number): Promise<string> {
    const img = await this.loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No context')

    ctx.drawImage(img, 0, 0, width, height)
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
