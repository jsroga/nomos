import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitImageGenerate, submitImageUpscale, submitImageEdit } from '../apiframe'
import { buildGenerateBody } from '../apiframe-generate-body'
import {
  ApiframeGenerateImageCapacity,
  apiframeTooManyInputImagesMessage,
} from '../apiframe-image-capacity'
import {
  APIFRAME_FLUX_FILL_GUIDANCE,
  APIFRAME_GENERATE_PROMPT_MAX_CHARS,
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
} from '../utils/apiframe'
import { recordFromJson } from '@/shared/data/deep-merge'
import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  GenerationPromptCopy,
  TileImageRoleLabel,
} from '@/shared/data/server/constants/generation-prompts'

const API_KEY = 'afk_test'
const PROMPT = 'a rainy harbour quay'
const CONTEXT_URL = 'https://cdn.example.com/context.png'
const MASK_URL = 'https://cdn.example.com/mask.png'
const STYLE_URL = 'https://cdn.example.com/style.png'
const STYLE_URL_TWO = 'https://cdn.example.com/style-2.png'
const STYLE_URL_THREE = 'https://cdn.example.com/style-3.png'
const EXTRA_URL = 'https://cdn.example.com/extra.png'
const OVER_CAPACITY_URL = 'https://cdn.example.com/over.png'
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
  it('sends the first Grok input URL as grokImagineParams.image string', async () => {
    const body = await generateWith(ApiframeImageModel.GrokImagineImage)
    const params = recordFromJson(body[ApiframeParamsKey.GrokImagine])
    expect(params.aspect_ratio).toBe(ASPECT_RATIO)
    expect(params.image).toBe(CONTEXT_URL)
  })

  it('sends the full URL array under nanoBananaParams.image_input', async () => {
    const body = await generateWith(ApiframeImageModel.NanoBanana)
    expect(recordFromJson(body[ApiframeParamsKey.NanoBanana])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      image_input: [CONTEXT_URL, STYLE_URL],
    })
  })

  it('sends the full URL array under fluxParams.input_images', async () => {
    const body = await generateWith(ApiframeImageModel.Flux2Pro)
    expect(recordFromJson(body[ApiframeParamsKey.Flux])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      [ApiframeImageField.InputImages]: [CONTEXT_URL, STYLE_URL],
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

  it('keeps a single Grok image as a string', () => {
    const body = buildGenerateBody({
      model: ApiframeImageModel.GrokImagineImage,
      prompt: PROMPT,
      aspectRatio: ASPECT_RATIO,
      imageInputUrls: [CONTEXT_URL],
    })
    expect(recordFromJson(body[ApiframeParamsKey.GrokImagine])).toEqual({
      aspect_ratio: ASPECT_RATIO,
      image: CONTEXT_URL,
    })
  })

  it('accepts packed context plus three style URLs on Grok', () => {
    const imageInputUrls = [CONTEXT_URL, STYLE_URL, STYLE_URL_TWO, STYLE_URL_THREE]
    const body = buildGenerateBody({
      model: ApiframeImageModel.GrokImagineImage,
      prompt: PROMPT,
      imageInputUrls,
    })
    expect(recordFromJson(body[ApiframeParamsKey.GrokImagine]).image).toBe(CONTEXT_URL)
  })

  it('clips a Grok generate prompt to the API max', () => {
    const prompt = 'x'.repeat(APIFRAME_GENERATE_PROMPT_MAX_CHARS + 80)
    const body = buildGenerateBody({
      model: ApiframeImageModel.GrokImagineImage,
      prompt,
    })
    expect(typeof body.prompt).toBe('string')
    expect(String(body.prompt).length).toBe(APIFRAME_GENERATE_PROMPT_MAX_CHARS)
  })

  it('keeps a short Grok prompt unchanged', () => {
    const body = buildGenerateBody({
      model: ApiframeImageModel.GrokImagineImage,
      prompt: PROMPT,
    })
    expect(body.prompt).toBe(PROMPT)
  })

  it('keeps the tile subject when packing copy blows past the API max', () => {
    const packing = `${TileImageRoleLabel.Image} 1 is packing layout ${'seam '.repeat(500)}`
    const subject =
      `${GenerationPromptCopy.TileDescriptionDirectivePrefix} collapsed lighthouse on a shingle beach${GenerationPromptCopy.TileDescriptionDirectiveSuffix}`
    const prompt = `${packing}${StringSeparator.DoubleNewline}${subject}`
    expect(prompt.length).toBeGreaterThan(APIFRAME_GENERATE_PROMPT_MAX_CHARS)
    expect(prompt.slice(0, APIFRAME_GENERATE_PROMPT_MAX_CHARS)).not.toContain('collapsed lighthouse')
    const body = buildGenerateBody({
      model: ApiframeImageModel.GrokImagineImage,
      prompt,
    })
    const fitted = String(body.prompt)
    expect(fitted.length).toBeLessThanOrEqual(APIFRAME_GENERATE_PROMPT_MAX_CHARS)
    expect(fitted).toContain('collapsed lighthouse on a shingle beach')
  })

  it('rejects a sixth Grok input image', () => {
    const imageInputUrls = [
      CONTEXT_URL,
      STYLE_URL,
      STYLE_URL_TWO,
      STYLE_URL_THREE,
      EXTRA_URL,
      OVER_CAPACITY_URL,
    ]
    expect(() =>
      buildGenerateBody({
        model: ApiframeImageModel.GrokImagineImage,
        prompt: PROMPT,
        imageInputUrls,
      }),
    ).toThrow(
      apiframeTooManyInputImagesMessage(
        ApiframeImageModel.GrokImagineImage,
        imageInputUrls.length,
        ApiframeGenerateImageCapacity.Grok,
      ),
    )
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
