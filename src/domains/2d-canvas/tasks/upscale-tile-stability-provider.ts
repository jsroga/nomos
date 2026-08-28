import { logger, metadata } from '@trigger.dev/sdk'
import { ContentType } from '@/shared/data/constants/protocol'
import { UPSCALE_PROMPTS } from '@/shared/data/server/prompts'

async function upscaleWithStabilityConservative(
  upscaleUrl: string,
  formData: FormData,
  apiKey: string
): Promise<string> {
  const axios = (await import('axios')).default
  const response = await axios.post(upscaleUrl, formData, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'image/*',
    },
    responseType: 'arraybuffer',
    validateStatus: () => true,
  })

  if (response.status !== 200) {
    const errorText = new TextDecoder().decode(response.data)
    throw new Error(`Stability API error (${response.status}): ${errorText}`)
  }

  await metadata.set('progress', 100)
  return btoa(
    new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
}

async function pollStabilityCreativeResult(
  resultUrl: string,
  apiKey: string,
  maxAttempts: number
): Promise<string> {
  const axios = (await import('axios')).default

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    await metadata.set('progress', Math.min(90, (attempt / maxAttempts) * 100))

    const resultResponse = await axios.get(resultUrl, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: '*/*',
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
    })

    if (resultResponse.status === 200) {
      logger.info('Stability creative upscale complete!')
      await metadata.set('progress', 100)
      return btoa(
        new Uint8Array(resultResponse.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )
    }

    if (resultResponse.status === 202) {
      logger.info(`Stability still processing (attempt ${attempt + 1}/${maxAttempts})`)
      continue
    }

    const errorText = new TextDecoder().decode(resultResponse.data)
    throw new Error(`Stability result fetch error (${resultResponse.status}): ${errorText}`)
  }

  throw new Error('Stability upscale timeout')
}

export async function upscaleWithStability(
  imageBase64: string,
  apiKey: string,
  mode: 'conservative' | 'creative' = 'conservative'
): Promise<string> {
  logger.info('Starting Stability AI upscale', { mode })
  await metadata.set('stage', 'stability_processing')

  const axios = (await import('axios')).default
  const upscaleUrl = `https://api.stability.ai/v2beta/stable-image/upscale/${mode}`

  const byteCharacters = atob(imageBase64.replace(/^data:image\/\w+;base64,/, ''))
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: ContentType.Png })

  const formData = new FormData()
  formData.append('image', blob, 'input.png')
  formData.append('prompt', UPSCALE_PROMPTS.STABILITY)
  formData.append('output_format', 'png')

  if (mode === 'conservative') {
    return upscaleWithStabilityConservative(upscaleUrl, formData, apiKey)
  }

  const submitResponse = await axios.post(upscaleUrl, formData, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: ContentType.Json,
    },
    validateStatus: () => true,
  })

  if (submitResponse.status !== 200) {
    throw new Error(
      `Stability API error (${submitResponse.status}): ${submitResponse.data?.message}`
    )
  }

  const generationId = submitResponse.data?.id
  if (!generationId) {
    throw new Error('No generation ID returned from Stability API')
  }

  logger.info('Stability generation ID', { generationId })
  await metadata.set('generation_id', generationId)

  const resultUrl = `https://api.stability.ai/v2beta/results/${generationId}`
  return pollStabilityCreativeResult(resultUrl, apiKey, 60)
}
