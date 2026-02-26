import { AIModel, AIModelConfig, TileContext } from './types'
import { assembleContextImage } from './contextAssembler'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
  inlineData?: {
    mime_type: string
    data: string
  }
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[]
  }
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  error?: {
    message: string
  }
}

export class GeminiAIModel implements AIModel {
  id = 'gemini'
  name = 'Nano Banana Pro (Gemini 3)'
  description =
    'Uses Google\'s state-of-the-art Gemini 3 Pro Image model for high-fidelity generation.'

  validateConfig(config: AIModelConfig): boolean {
    return !!config.apiKey
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error('API Key missing')

    // Allow user to override model ID via config, default to imagen-3.0-generate-001
    const modelId = config.params?.modelId || 'imagen-3.0-generate-001'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${config.apiKey}`

    // Prepare context
    // On Server, we can use sharp for faster/more robust assembly
    // On Client, we use the fallback Canvas version
    let contextImageBase64: string
    let cropRect: { x: number; y: number; width: number; height: number }

    if (typeof window === 'undefined') {
      // SERVER SIDE
      const { imageService } = await import('@/lib/server/image-service')
      const {
        image,
        mask,
        cropRect: serverCropRect,
      } = await imageService.assembleContext(context, 1024)
      contextImageBase64 = image.toString('base64')
      cropRect = serverCropRect
    } else {
      // CLIENT SIDE
      const { imageBlob, cropRect: clientCropRect } = await assembleContextImage(context, 1024)
      contextImageBase64 = await this.blobToBase64(imageBlob)
      cropRect = clientCropRect
    }

    // Construct Prompt - using master template directly
    // TODO: Extract this prompt template to a shared configuration or constant
    const finalPrompt = `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Ensure continuous lines, consistent perspective (Isometric), and matching lighting. Do not generate borders or frames.`

    // Gemini generateContent Payload
    const payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: contextImageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as GeminiResponse

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP Error: ${response.status}`)
      }

      if (data.error) {
        throw new Error(data.error.message)
      }

      // Gemini Response Parsing
      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('No candidates returned')

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Generation blocked by safety filters')
      }

      const parts = candidate.content?.parts
      if (!parts || parts.length === 0) throw new Error('No content parts returned')

      // Look for inline_data (image)
      const imagePart = parts.find(p => p.inline_data || p.inlineData)

      if (!imagePart) {
        // If no image, maybe it returned text?
        const textPart = parts.find(p => p.text)
        if (textPart) {
          // If it returned text, it might be refusing or describing.
          // But we need an image.
          throw new Error(
            `Gemini returned text instead of image: ${textPart.text?.substring(0, 100)}...`
          )
        }
        throw new Error('No image found in response')
      }

      const inlineData = imagePart.inline_data || imagePart.inlineData
      if (!inlineData) throw new Error('Image data missing in response part')

      const generatedBase64 = inlineData.data

      // Crop result
      if (typeof window === 'undefined') {
        // SERVER SIDE with sharp
        const { imageService } = await import('@/lib/server/image-service')
        const croppedBuffer = await imageService.crop(
          Buffer.from(generatedBase64, 'base64'),
          cropRect
        )
        return `data:image/png;base64,${croppedBuffer.toString('base64')}`
      } else {
        // CLIENT SIDE with Canvas
        const dataUrl = `data:image/png;base64,${generatedBase64}`
        return await this.cropImage(dataUrl, cropRect)
      }
    } catch (error: unknown) {
      console.error('Gemini generation failed', error)
      throw new Error(`Gemini failed: ${error instanceof Error ? error.message : String(error)}`)
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
