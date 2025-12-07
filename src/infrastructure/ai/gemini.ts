/* eslint-disable @typescript-eslint/no-explicit-any */
import { AIModel, AIModelConfig, TileContext } from './types'
import { assembleContextImage } from './contextAssembler'
import { enhancePromptWithStyle } from './styleAnalyzer'
import axios from 'axios'

export class GeminiAIModel implements AIModel {
  id = 'gemini'
  name = 'Nano Banana Pro (Gemini 3)'
  description =
    "Uses Google's state-of-the-art Gemini 3 Pro Image model for high-fidelity generation."

  validateConfig(config: AIModelConfig): boolean {
    return !!config.apiKey
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error('API Key missing')

    // Allow user to override model ID via config, default to imagen-3.0-generate-001
    const modelId = config.params?.modelId || 'imagen-3.0-generate-001'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${config.apiKey}`

    // Enhance prompt
    const neighborList = Object.values(context.neighbors).filter(Boolean)
    const enhancedPrompt = await enhancePromptWithStyle(prompt, neighborList)

    // Prepare context
    const { imageBlob, cropRect } = await assembleContextImage(context, 1024)
    const base64Image = await this.blobToBase64(imageBlob)

    // Construct Prompt
    const finalPrompt = `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${enhancedPrompt}. Ensure continuous lines, consistent perspective (Isometric), and matching lighting. Do not generate borders or frames.`

    // Gemini generateContent Payload
    const payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: base64Image,
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
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.data.error) {
        throw new Error(response.data.error.message)
      }

      // Gemini Response Parsing
      const candidate = response.data.candidates?.[0]
      if (!candidate) throw new Error('No candidates returned')

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Generation blocked by safety filters')
      }

      const parts = candidate.content?.parts
      if (!parts || parts.length === 0) throw new Error('No content parts returned')

      // Look for inline_data (image)
      const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)

      if (!imagePart) {
        // If no image, maybe it returned text?
        const textPart = parts.find((p: any) => p.text)
        if (textPart) {
          // If it returned text, it might be refusing or describing.
          // But we need an image.
          throw new Error(
            `Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`
          )
        }
        throw new Error('No image found in response')
      }

      const inlineData = imagePart.inline_data || imagePart.inlineData
      const generatedBase64 = inlineData.data
      const dataUrl = `data:image/png;base64,${generatedBase64}`

      return await this.cropImage(dataUrl, cropRect)
    } catch (error: any) {
      console.error('Gemini generation failed', error.response?.data || error)
      throw new Error(`Gemini failed: ${error.response?.data?.error?.message || error.message}`)
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
