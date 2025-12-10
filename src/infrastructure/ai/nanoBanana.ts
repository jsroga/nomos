/* eslint-disable indent */
import axios from 'axios'

export class NanoBananaProModel {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model || 'gemini-3-pro-image-preview' // Default as requested
  }

  async upscale(base64Image: string, prompt: string, creativity: number): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const finalPrompt = `Upscale this image to be higher resolution with updated fidelity and significantly more details. ${prompt}`

    const payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: 'image/png', data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: creativity,
        maxOutputTokens: 2048,
      },
    }

    return this.callApi(url, payload)
  }

  async inpainting(base64Image: string, maskBase64: string, prompt: string, styleReferenceUrls?: string[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    // Build style reference hint
    const styleRefHint = styleReferenceUrls?.length 
      ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
      : ''

    // Sending both image and mask.
    // We assume the model understands the second image is a mask or we describe it.

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt + styleRefHint }, // User prompt first with style refs
            { inline_data: { mime_type: 'image/png', data: base64Image } },
            { inline_data: { mime_type: 'image/png', data: maskBase64 } },
            {
              text: 'Edit the first image using the second image as a mask. The white area in the mask indicates where to edit. Seamlessly blend the changes.',
            }, // Instruction last
          ],
        },
      ],
    }

    return this.callApi(url, payload)
  }

  private async callApi(url: string, payload: unknown): Promise<string> {
    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      })

      const candidate = response.data.candidates?.[0]
      if (!candidate) throw new Error('No candidates returned')

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Generation blocked by safety filters')
      }

      const parts = candidate.content?.parts
      if (!parts || parts.length === 0) throw new Error('No content parts returned')

      // Look for inline_data (image)
      const imagePart = parts.find((p: unknown) => {
        const part = p as Record<string, unknown>
        return part.inline_data || part.inlineData
      })

      if (imagePart) {
        const part = imagePart as Record<string, unknown>
        const inlineData = part.inline_data || part.inlineData
        return (inlineData as Record<string, string>).data
      }

      // If text returned
      const textPart = parts.find((p: unknown) => {
        const part = p as Record<string, unknown>
        return part.text
      })
      if (textPart) {
        const part = textPart as Record<string, string>
        throw new Error(`Gemini returned text: ${part.text.substring(0, 100)}...`)
      }

      throw new Error('No image found in response')
    } catch (error: unknown) {
      console.error('Gemini API failed:', error)
      const err = error as {
        response?: { data?: { error?: { message?: string } }; message?: string }
      }
      const msg = err.response?.data?.error?.message || (error as Error).message
      throw new Error(`Gemini failed: ${msg}`)
    }
  }
}
