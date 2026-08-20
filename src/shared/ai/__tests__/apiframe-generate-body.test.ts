import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitImageGenerate, submitImageUpscale, submitImageEdit } from '../apiframe'
import {
  APIFRAME_FLUX_FILL_GUIDANCE,
  ApiframeEditModel,
  ApiframeFluxFillMode,
  ApiframeGptImage2OutputFormat,
  ApiframeGptImage2Quality,
  ApiframeImageField,
  ApiframeImageModel,
  ApiframeParamsKey,
  ApiframeTopazModelType,
  ApiframeTopazOutputFormat,
  ApiframeTopazUpscaleFactor,
  ApiframeUpscaleModel,
} from '../constants/apiframe'
import { recordFromJson } from '@/shared/data/deep-merge'

const API_KEY = 'afk_test'
const PROMPT = 'a rainy harbour quay'
const CONTEXT_URL = 'https://cdn.example.com/context.png'
const MASK_URL = 'https://cdn.example.com/mask.png'
const STYLE_URL = 'https://cdn.example.com/style.png'
const ASPECT_RATIO = '1:1'

let sentBody: Record<string, unknown> = {}

beforeEach(() => {
  sentBody = {}
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      sentBody = recordFromJson(JSON.parse(String(init?.body ?? '{}')))
      return { ok: true, json: async () => ({ jobId: 'job_1' }) }
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function generateWith(model: ApiframeImageModel): Promise<Record<string, unknown>> {
  await submitImageGenerate({
    model,
    prompt: PROMPT,
    apiKey: API_KEY,
    aspectRatio: ASPECT_RATIO,
    imageInputUrls: [CONTEXT_URL, STYLE_URL],
  })
  return recordFromJson(sentBody)
}

describe('Apiframe generate body', () => {
  it('sends one image URL under grokImagineParams.image', async () => {
    const body = await generateWith(ApiframeImageModel.GrokImagineImage)
    expect(recordFromJson(body[ApiframeParamsKey.GrokImagine])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      image: CONTEXT_URL,
    })
  })

  it('sends the full URL array under nanoBananaParams.image_input', async () => {
    const body = await generateWith(ApiframeImageModel.NanoBanana)
    expect(recordFromJson(body[ApiframeParamsKey.NanoBanana])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      image_input: [CONTEXT_URL, STYLE_URL],
    })
  })

  it('sends one image URL under fluxParams.image_prompt', async () => {
    const body = await generateWith(ApiframeImageModel.Flux2Pro)
    expect(recordFromJson(body[ApiframeParamsKey.Flux])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      image_prompt: CONTEXT_URL,
    })
  })

  it('sends the full URL array under gptImage2Params.input_images', async () => {
    const body = await generateWith(ApiframeImageModel.GptImage2)
    expect(recordFromJson(body[ApiframeParamsKey.GptImage2])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      [ApiframeImageField.InputImages]: [CONTEXT_URL, STYLE_URL],
      quality: ApiframeGptImage2Quality.High,
      output_format: ApiframeGptImage2OutputFormat.Png,
    })
  })

  it('omits the image field entirely for text-to-image', async () => {
    await submitImageGenerate({
      model: ApiframeImageModel.GrokImagineImage,
      prompt: PROMPT,
      apiKey: API_KEY,
      aspectRatio: ASPECT_RATIO,
    })
    expect(recordFromJson(sentBody[ApiframeParamsKey.GrokImagine])).toEqual({
      aspect_ratio: ASPECT_RATIO,
    })
  })
})

describe('Apiframe Topaz upscale body', () => {
  it('sends model_type and integer upscale_factor under topazUpscaleParams', async () => {
    await submitImageUpscale({
      apiKey: API_KEY,
      model: ApiframeUpscaleModel.TopazImageUpscale,
      imageUrl: CONTEXT_URL,
      upscaleFactor: ApiframeTopazUpscaleFactor.One,
      modelType: ApiframeTopazModelType.Redefine,
    })
    expect(sentBody.model).toBe(ApiframeUpscaleModel.TopazImageUpscale)
    const params = recordFromJson(sentBody[ApiframeParamsKey.TopazUpscale])
    expect(params).toEqual({
      image: CONTEXT_URL,
      upscale_factor: ApiframeTopazUpscaleFactor.One,
      model_type: ApiframeTopazModelType.Redefine,
      face_enhance: false,
      output_format: ApiframeTopazOutputFormat.Png,
    })
    expect(typeof params.upscale_factor).toBe('number')
  })
})

describe('Apiframe Flux Fill edit body', () => {
  it('sends the fill prompt only inside fluxFillParams', async () => {
    await submitImageEdit({
      apiKey: API_KEY,
      imageUrl: CONTEXT_URL,
      maskUrl: MASK_URL,
      prompt: PROMPT,
    })
    expect(sentBody.model).toBe(ApiframeEditModel.FluxFillPro)
    expect(sentBody).not.toHaveProperty('prompt')
    expect(recordFromJson(sentBody[ApiframeParamsKey.FluxFill])).toEqual({
      image: CONTEXT_URL,
      prompt: PROMPT,
      mask: MASK_URL,
      mode: ApiframeFluxFillMode.Inpaint,
      guidance: APIFRAME_FLUX_FILL_GUIDANCE,
    })
  })
})
