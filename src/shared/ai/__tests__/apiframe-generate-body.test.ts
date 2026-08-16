import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitImageGenerate } from '../apiframe'
import { ApiframeImageModel, ApiframeParamsKey } from '../constants/apiframe'
import { recordFromJson } from '@/shared/data/deep-merge'

const API_KEY = 'afk_test'
const PROMPT = 'a rainy harbour quay'
const CONTEXT_URL = 'https://cdn.example.com/context.png'
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
