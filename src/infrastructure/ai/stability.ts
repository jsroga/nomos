import { AIModel, AIModelConfig, TileContext } from './types'
import { assembleContextImage } from './contextAssembler'
import axios from 'axios'
import { LocalStorageKeys } from '@/constants/localStorage'

export class StabilityAIModel implements AIModel {
  id = 'stability'
  name = 'Stability AI (SDXL)'
  description =
    'Uses Stable Diffusion XL for high-quality inpainting. Supports steps, cfg, and samplers.'

  validateConfig(config: AIModelConfig): boolean {
    return !!config.apiKey
  }

  async textToImage(prompt: string, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error('API Key missing')

    const engineId = 'stable-diffusion-xl-1024-v1-0'
    const apiHost = 'https://api.stability.ai'
    const url = `${apiHost}/v1/generation/${engineId}/text-to-image`

    const formData = new FormData()
    // Append "seamless" logic or specific texture prompt engineering here or in the service
    formData.append(
      'text_prompts[0][text]',
      prompt + ', seamless texture, top down view, flat lighting, high quality, 8k'
    )
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', (config.params?.cfgScale || 7).toString())
    formData.append('samples', '1')
    formData.append('steps', (config.params?.steps || 30).toString())

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
      })

      if (response.status !== 200) {
        throw new Error(`Non-200 response: ${response.statusText}`)
      }

      const artifacts = response.data.artifacts
      if (!artifacts || artifacts.length === 0) {
        throw new Error('No image generated')
      }

      const base64Image = artifacts[0].base64
      return `data:image/png;base64,${base64Image}`
    } catch (error: unknown) {
      console.error('Stability API failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Stability generation failed: ${message}`)
    }
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error('API Key missing')

    const engineId = 'stable-diffusion-xl-1024-v1-0'
    const apiHost = 'https://api.stability.ai'
    const url = `${apiHost}/v1/generation/${engineId}/image-to-image/masking`

    // Use prompt directly for edge matching
    let enhancedPrompt = `Fill seamlessly to match surrounding edges: ${prompt}. Maintain isometric perspective and consistent style.`

    // Append style reference URLs if available (for models that might support it, or as information)
    if (context.styleReferenceUrls && context.styleReferenceUrls.length > 0) {
      console.log('Injecting Style References:', context.styleReferenceUrls)
      // Midjourney uses --sref, Stability doesn't standardized on this in text prompt,
      // but appending it ensures it "is sent in the request" as per user issue.
      enhancedPrompt += ` --sref ${context.styleReferenceUrls.join(' ')}`
    }

    // Prepare context
    // SDXL Inpainting works best with a 1024x1024 image and a mask.
    // Our assembleContextImage returns exactly that.
    const { imageBlob, maskBlob, cropRect } = await assembleContextImage(context, 1024)

    const formData = new FormData()
    formData.append('init_image', imageBlob)
    formData.append('mask_image', maskBlob)
    formData.append('text_prompts[0][text]', enhancedPrompt)
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', (config.params?.cfgScale || 7).toString())
    formData.append('samples', '1')
    formData.append('steps', (config.params?.steps || 30).toString())

    // SDXL specific: "mask_source" - MASK_IMAGE_WHITE (white pixels are masked/generated)
    // Our mask has White = Keep, Transparent = Edit.
    // Wait, let's check assembleContextImage.
    // It fills with White (Keep), clears target to Transparent (Edit).
    // Stability API: "mask_source": "MASK_IMAGE_WHITE" means white pixels are generated.
    // "MASK_IMAGE_BLACK" means black pixels are generated.
    // Our mask is White/Transparent.
    // If we convert Transparent to Black, we have White (Keep) / Black (Edit).
    // So we should use MASK_IMAGE_BLACK.

    // BUT, `assembleContextImage` returns a PNG with transparency.
    // Stability might treat transparency as black?
    // Let's ensure we send a proper B/W mask if needed.
    // Actually, let's look at `assembleContextImage` again.
    // It returns a PNG.

    // Let's assume we need to be explicit.
    // For now, let's try sending it as is. If Stability supports alpha channel masks, great.
    // Docs say: "mask_image": "Image to use as a mask. It must be the same dimensions as `init_image`. The mask should be black and white, where black pixels are preserved and white pixels are generated (or vice versa depending on `mask_source`)."

    // Our mask: White = Keep, Transparent = Edit.
    // If we treat Transparent as Black, we have White (Keep) / Black (Edit).
    // So we want "Black pixels are generated". No, "White pixels are preserved".
    // So "mask_source": "MASK_IMAGE_BLACK" (Black generated)

    // Let's default to MASK_IMAGE_BLACK and hope transparency is read as black.
    // Or we can update assembleContextImage to return opaque B/W mask.
    // `assembleContextImage` currently returns transparent hole.

    formData.append('mask_source', 'MASK_IMAGE_BLACK')

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
      })

      if (response.status !== 200) {
        throw new Error(`Non-200 response: ${response.statusText}`)
      }

      const artifacts = response.data.artifacts
      if (!artifacts || artifacts.length === 0) {
        throw new Error('No image generated')
      }

      const base64Image = artifacts[0].base64
      const dataUrl = `data:image/png;base64,${base64Image}`

      return await this.cropImage(dataUrl, cropRect)
    } catch (error: unknown) {
      console.error('Stability API failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Stability generation failed: ${message}`)
    }
  }

  async upscale(base64Image: string, prompt: string, creativity: number): Promise<string> {
    // Get API Key from AI Service (or localStorage for now as a fallback/hack since we are bypassing aiService)
    // Ideally UpscaleService should pass it.
    let apiKey = ''
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LocalStorageKeys.AI_CONFIG_STABILITY)
      if (saved) {
        apiKey = JSON.parse(saved).apiKey
      }
    }

    if (!apiKey) throw new Error('Stability API Key not found. Please configure it in Settings.')

    const engineId = 'stable-diffusion-xl-1024-v1-0'
    const apiHost = 'https://api.stability.ai'
    const url = `${apiHost}/v1/generation/${engineId}/image-to-image`

    const formData = new FormData()
    // Convert base64 to blob
    const byteCharacters = atob(base64Image)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    formData.append('init_image', blob)
    // Creativity 0.0 = exact copy (low strength), 1.0 = creative (high strength).
    // Stability `image_strength`: 0.0 to 1.0.
    // 1.0 means "use init image heavily", 0.0 means "ignore init image".
    // So `image_strength` = 1 - creativity.
    // If creativity is 0.3 (low), strength should be 0.7.
    const imageStrength = 1 - Math.min(Math.max(creativity, 0), 1)

    formData.append('init_image_mode', 'IMAGE_STRENGTH')
    formData.append('image_strength', imageStrength.toString())

    formData.append(
      'text_prompts[0][text]',
      prompt + ', high resolution, highly detailed, 8k, masterpiece'
    )
    formData.append('text_prompts[0][weight]', '1')

    // Negative prompt
    formData.append('text_prompts[1][text]', 'blur, low quality, pixelated, fuzzy')
    formData.append('text_prompts[1][weight]', '-1')

    formData.append('cfg_scale', '7')
    formData.append('samples', '1')
    formData.append('steps', '30')

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (response.status !== 200) {
        throw new Error(`Non-200 response: ${response.statusText}`)
      }

      const artifacts = response.data.artifacts
      if (!artifacts || artifacts.length === 0) {
        throw new Error('No image generated')
      }

      return artifacts[0].base64
    } catch (error: unknown) {
      console.error('Stability Upscale failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Stability upscale failed: ${message}`)
    }
  }

  async upscale4k(
    base64Image: string,
    apiKey?: string,
    mode: 'creative' | 'conservative' = 'conservative'
  ): Promise<string> {
    const key =
      apiKey ||
      (typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem(LocalStorageKeys.AI_CONFIG_STABILITY) || '{}').apiKey
        : '')
    if (!key) throw new Error('Stability API Key not found for 4k upscale')

    const upscaleUrl = `https://api.stability.ai/v2beta/stable-image/upscale/${mode}`

    try {
      console.log(`Stability: Starting v2beta ${mode} upscale...`)

      const formData = new FormData()

      // Convert base64 to blob
      const byteCharacters = atob(base64Image)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })

      formData.append('image', blob, 'input.png')
      formData.append('prompt', 'upscale maintaining the same style, high quality, detailed, sharp')
      formData.append('output_format', 'png')

      // Conservative mode returns image directly, creative mode returns ID for async processing
      if (mode === 'conservative') {
        // Conservative mode: synchronous, returns image directly
        const response = await axios.post(upscaleUrl, formData, {
          headers: {
            authorization: `Bearer ${key}`,
            accept: 'image/*',
          },
          responseType: 'arraybuffer',
          validateStatus: () => true,
        })

        if (response.status !== 200) {
          const errorText = new TextDecoder().decode(response.data)
          throw new Error(`Stability API error (${response.status}): ${errorText}`)
        }

        // Convert to base64 directly
        console.log('Stability: Conservative upscale complete!')
        const base64 = btoa(
          new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        return base64
      } else {
        // Creative mode: asynchronous, returns generation ID
        const submitResponse = await axios.post(upscaleUrl, formData, {
          headers: {
            authorization: `Bearer ${key}`,
            accept: 'application/json',
          },
          validateStatus: () => true,
        })

        if (submitResponse.status !== 200) {
          const errorMsg = submitResponse.data?.message || submitResponse.statusText
          throw new Error(`Stability API error (${submitResponse.status}): ${errorMsg}`)
        }

        const generationId = submitResponse.data?.id
        if (!generationId) {
          throw new Error('No generation ID returned from Stability API')
        }

        console.log('Stability: Generation ID:', generationId, '- Polling for result...')

        // Poll for result with 5 second intervals, max 50 retries
        const resultUrl = `https://api.stability.ai/v2beta/results/${generationId}`
        const maxAttempts = 50
        const pollInterval = 5000

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))

          const resultResponse = await axios.get(resultUrl, {
            headers: {
              authorization: `Bearer ${key}`,
              accept: '*/*',
            },
            responseType: 'arraybuffer',
            validateStatus: () => true,
          })

          if (resultResponse.status === 200) {
            console.log('Stability: Creative upscale complete!')
            const base64 = btoa(
              new Uint8Array(resultResponse.data).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            )
            return base64
          } else if (resultResponse.status === 202) {
            console.log(
              `Stability: Still processing (attempt ${attempt + 1}/${maxAttempts}, waiting 5s...)`
            )
            continue
          } else {
            const errorText = new TextDecoder().decode(resultResponse.data)
            throw new Error(`Stability result fetch error (${resultResponse.status}): ${errorText}`)
          }
        }

        throw new Error(
          'Stability upscale timeout - result not ready after 50 retries (250 seconds)'
        )
      }
    } catch (error: unknown) {
      console.error('Stability Upscale failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Stability upscale failed: ${message}`)
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

const stabilityAI = new StabilityAIModel()
