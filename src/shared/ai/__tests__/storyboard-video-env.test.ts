import { describe, expect, it } from 'vitest'
import { ImageEnvVar } from '@/shared/ai/constants/image-env'
import { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import {
  resolveStoryboardVideoDuration,
  resolveStoryboardVideoLook,
  resolveStoryboardVideoModel,
  storyboardVideoFromPreset,
  STORYBOARD_VIDEO_DURATION,
  StoryboardVideoLook,
  StoryboardVideoPreset,
} from '../storyboard-video-env'

describe('storyboard video env', () => {
  it('defaults the model to kling-3.0', () => {
    expect(resolveStoryboardVideoModel({})).toBe(ApiframeVideoModel.Kling30)
  })

  it('honors IMAGE_STORYBOARD_VIDEO_MODEL', () => {
    expect(
      resolveStoryboardVideoModel({
        [ImageEnvVar.StoryboardVideoModel]: ApiframeVideoModel.Kling30,
      }),
    ).toBe(ApiframeVideoModel.Kling30)
    expect(
      resolveStoryboardVideoModel({
        [ImageEnvVar.StoryboardVideoModel]: ApiframeVideoModel.Seedance25,
      }),
    ).toBe(ApiframeVideoModel.Seedance25)
  })

  it('prefers the UI-selected model over env', () => {
    expect(
      resolveStoryboardVideoModel(
        { [ImageEnvVar.StoryboardVideoModel]: ApiframeVideoModel.Kling30 },
        ApiframeVideoModel.Seedance25,
      ),
    ).toBe(ApiframeVideoModel.Seedance25)
  })

  it('defaults look to storyboard', () => {
    expect(resolveStoryboardVideoLook()).toBe(StoryboardVideoLook.Storyboard)
    expect(resolveStoryboardVideoLook(StoryboardVideoLook.Film)).toBe(StoryboardVideoLook.Film)
  })

  it('maps four dropdown presets to model × look', () => {
    expect(storyboardVideoFromPreset(StoryboardVideoPreset.KlingFilm)).toEqual({
      model: ApiframeVideoModel.Kling30,
      look: StoryboardVideoLook.Film,
    })
    expect(storyboardVideoFromPreset(StoryboardVideoPreset.KlingStoryboard)).toEqual({
      model: ApiframeVideoModel.Kling30,
      look: StoryboardVideoLook.Storyboard,
    })
    expect(storyboardVideoFromPreset(StoryboardVideoPreset.SeedanceFilm)).toEqual({
      model: ApiframeVideoModel.Seedance25,
      look: StoryboardVideoLook.Film,
    })
    expect(storyboardVideoFromPreset(StoryboardVideoPreset.SeedanceStoryboard)).toEqual({
      model: ApiframeVideoModel.Seedance25,
      look: StoryboardVideoLook.Storyboard,
    })
  })

  it('pins duration to 15s for both models', () => {
    expect(resolveStoryboardVideoDuration({})).toBe(STORYBOARD_VIDEO_DURATION)
    expect(
      resolveStoryboardVideoDuration(
        { [ImageEnvVar.StoryboardVideoDuration]: '10' },
        ApiframeVideoModel.Seedance25,
      ),
    ).toBe(STORYBOARD_VIDEO_DURATION)
    expect(STORYBOARD_VIDEO_DURATION).toBe(15)
  })
})
