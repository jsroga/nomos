import { describe, expect, it } from 'vitest'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  buildKlingGenerateBody,
  buildVideoGenerateBody,
  klingMultiPromptJson,
  pickApiframeVideoUrl,
} from '../apiframe-video'
import {
  ApiframeGenerateAspectRatio,
  ApiframeKlingMode,
  ApiframeKlingParam,
  ApiframeParamsKey,
  ApiframeSeedanceParam,
  ApiframeSeedanceResolution,
  ApiframeVideoField,
  ApiframeVideoModel,
  KlingMultiPromptField,
} from '../constants/apiframe'

describe('buildKlingGenerateBody', () => {
  it('sends model, prompt, start image, duration, and native audio', () => {
    const body = buildKlingGenerateBody({
      apiKey: 'secret',
      prompt: 'Shot 1: Hero arrives',
      startImageUrl: 'https://cdn.example/sheet.png',
      model: ApiframeVideoModel.Kling30,
      duration: 10,
      generateAudio: true,
      negativePrompt: 'contact sheet',
    })
    expect(body.model).toBe(ApiframeVideoModel.Kling30)
    expect(body.prompt).toBe('Shot 1: Hero arrives')
    const kling = body[ApiframeParamsKey.Kling]
    expect(kling).toEqual({
      [ApiframeKlingParam.StartImage]: 'https://cdn.example/sheet.png',
      [ApiframeKlingParam.Duration]: 10,
      [ApiframeKlingParam.Mode]: ApiframeKlingMode.Pro,
      [ApiframeKlingParam.AspectRatio]: ApiframeGenerateAspectRatio.Widescreen,
      [ApiframeKlingParam.GenerateAudio]: true,
      [ApiframeKlingParam.NegativePrompt]: 'contact sheet',
    })
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('sends sequential multi_prompt shots as a JSON string', () => {
    const shots = [
      { prompt: 'Shot 1: Hero arrives', duration: 5 },
      { prompt: 'Shot 2: Door opens', duration: 5 },
    ]
    const body = buildKlingGenerateBody({
      apiKey: 'secret',
      prompt: 'Play the numbered stills in order',
      startImageUrl: 'https://cdn.example/sheet.png',
      model: ApiframeVideoModel.Kling30,
      duration: 10,
      generateAudio: true,
      multiPrompt: shots,
    })
    const kling = recordFromJson(body[ApiframeParamsKey.Kling])
    const multiPrompt = kling[ApiframeKlingParam.MultiPrompt]
    expect(typeof multiPrompt).toBe('string')
    expect(multiPrompt).toBe(klingMultiPromptJson(shots))
    expect(JSON.parse(String(multiPrompt))).toEqual([
      { [KlingMultiPromptField.Prompt]: 'Shot 1: Hero arrives', [KlingMultiPromptField.Duration]: 5 },
      { [KlingMultiPromptField.Prompt]: 'Shot 2: Door opens', [KlingMultiPromptField.Duration]: 5 },
    ])
  })
})

describe('buildVideoGenerateBody', () => {
  const seedanceOptions = {
    apiKey: 'secret',
    prompt: 'Play the numbered stills in order',
    startImageUrl: 'https://cdn.example/sheet.png',
    model: ApiframeVideoModel.Seedance25,
    duration: 30,
    generateAudio: true,
    negativePrompt: 'contact sheet',
    multiPrompt: [{ prompt: 'Shot 1: Hero arrives', duration: 5 }],
  }

  it('sends seedanceParams at 720p without klingParams or multi_prompt', () => {
    const body = buildVideoGenerateBody(seedanceOptions)
    expect(body.model).toBe(ApiframeVideoModel.Seedance25)
    expect(body[ApiframeParamsKey.Kling]).toBeUndefined()
    expect(body[ApiframeParamsKey.Seedance]).toEqual({
      [ApiframeSeedanceParam.StartImage]: 'https://cdn.example/sheet.png',
      [ApiframeSeedanceParam.Duration]: 30,
      [ApiframeSeedanceParam.Resolution]: ApiframeSeedanceResolution.P720,
      [ApiframeSeedanceParam.AspectRatio]: ApiframeGenerateAspectRatio.Widescreen,
      [ApiframeSeedanceParam.GenerateAudio]: true,
    })
    expect(JSON.stringify(body)).not.toContain(ApiframeKlingParam.MultiPrompt)
    expect(JSON.stringify(body)).not.toContain(ApiframeKlingParam.NegativePrompt)
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('keeps klingParams when the model is Kling 3.0', () => {
    const body = buildVideoGenerateBody({
      ...seedanceOptions,
      model: ApiframeVideoModel.Kling30,
      duration: 10,
    })
    expect(body.model).toBe(ApiframeVideoModel.Kling30)
    expect(body[ApiframeParamsKey.Seedance]).toBeUndefined()
    expect(body[ApiframeParamsKey.Kling]).toEqual(
      expect.objectContaining({
        [ApiframeKlingParam.Duration]: 10,
        [ApiframeKlingParam.MultiPrompt]: expect.any(String),
      }),
    )
  })
})

describe('pickApiframeVideoUrl', () => {
  it('reads camelCase videoUrl', () => {
    expect(
      pickApiframeVideoUrl({ [ApiframeVideoField.VideoUrl]: 'https://cdn.example/out.mp4' }),
    ).toBe('https://cdn.example/out.mp4')
  })

  it('reads snake_case video_url', () => {
    expect(
      pickApiframeVideoUrl({
        [ApiframeVideoField.VideoUrlSnake]: 'https://cdn.example/alt.mp4',
      }),
    ).toBe('https://cdn.example/alt.mp4')
  })

  it('returns undefined when the result has no video URL', () => {
    expect(pickApiframeVideoUrl({ images: ['https://cdn.example/still.png'] })).toBeUndefined()
  })
})
