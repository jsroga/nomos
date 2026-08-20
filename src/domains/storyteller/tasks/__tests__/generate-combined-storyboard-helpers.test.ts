import { describe, expect, it } from 'vitest'
import {
  APIFRAME_VIDEO_PROMPT_MAX_CHARS,
  ApiframeVideoModel,
  KLING_MULTI_PROMPT_SHOT_PROMPT_MAX_CHARS,
  KlingMultiPromptField,
} from '@/shared/ai/constants/apiframe'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import { beatsHaveImageUrl, storyboardKlingDirectorFields } from '../generate-combined-storyboard-helpers'
import {
  beatShotText,
  buildStoryboardMultiPrompt,
  buildStoryboardVideoPrompt,
  klingShotDurations,
  STORYBOARD_VIDEO_BEAT_MAX_CHARS,
  StoryboardCorePromptCopy,
  StoryboardCorePromptSource,
  StoryboardLookLock,
  StoryboardLookNegative,
  StoryboardSeedanceAvoid,
  StoryboardShotCut,
  StoryboardShotLookTag,
  storyboardLookNegative,
} from '../constants/storyboard-video-prompt'
import { generateStoryboardVideoCorePrompt } from '../storyboard-video-core-prompt'

describe('storyboard video prompt', () => {
  it('numbers shots from visualHook then logline', () => {
    const prompt = buildStoryboardVideoPrompt([
      { logline: 'Hero arrives', visualHook: 'Wide street' },
      { logline: 'Door opens' },
    ])
    expect(prompt).toContain('Shot 1: Wide street')
    expect(prompt).toContain('Shot 2: Door opens')
    expect(prompt.toLowerCase()).not.toContain('nolan')
  })

  it('locks storyboard look against photoreal film', () => {
    const prompt = buildStoryboardVideoPrompt(
      [{ logline: 'Hero arrives' }],
      StoryboardVideoLook.Storyboard,
    )
    expect(prompt).toContain(StoryboardLookLock.Storyboard)
    expect(prompt).not.toContain(StoryboardLookLock.Film)
  })

  it('locks film look against remaining a sketch', () => {
    const prompt = buildStoryboardVideoPrompt(
      [{ logline: 'Hero arrives' }],
      StoryboardVideoLook.Film,
    )
    expect(prompt).toContain(StoryboardLookLock.Film)
    expect(prompt).not.toContain(StoryboardLookLock.Storyboard)
  })

  it('bakes Seedance negatives into the prompt', () => {
    const prompt = buildStoryboardVideoPrompt(
      [{ logline: 'Hero arrives' }],
      StoryboardVideoLook.Storyboard,
      ApiframeVideoModel.Seedance25,
    )
    expect(prompt).toContain(StoryboardSeedanceAvoid.Prefix)
    expect(prompt).toContain(StoryboardLookNegative.Storyboard)
  })

  it('stays under the Apiframe prompt cap', () => {
    const beats = Array.from({ length: 30 }, (_, index) => ({
      logline: `beat ${index + 1} ${'x'.repeat(200)}`,
    }))
    expect(buildStoryboardVideoPrompt(beats).length).toBeLessThanOrEqual(
      APIFRAME_VIDEO_PROMPT_MAX_CHARS,
    )
  })

  it('truncates long beat copy', () => {
    const long = 'x'.repeat(STORYBOARD_VIDEO_BEAT_MAX_CHARS + 20)
    expect(beatShotText({ logline: long })).toHaveLength(STORYBOARD_VIDEO_BEAT_MAX_CHARS)
  })

  it('does not attach beat image URLs to the prompt', () => {
    const prompt = buildStoryboardVideoPrompt([
      {
        logline: 'Hero arrives',
        imagePrompt: 'close-up',
        imageUrl: 'https://cdn.example/beat.png',
      },
    ])
    expect(prompt).not.toContain('https://cdn.example/beat.png')
    expect(prompt.toLowerCase()).not.toContain('reference image')
  })

  it('detects whether any beat has an imageUrl', () => {
    expect(beatsHaveImageUrl([{ logline: 'a' }])).toBe(false)
    expect(beatsHaveImageUrl([{ logline: 'a', imageUrl: 'https://cdn.example/a.png' }])).toBe(
      true,
    )
  })

  it('sends integer shot durations that sum to the clip, and keeps Shot 1 cut language', () => {
    const shots = buildStoryboardMultiPrompt(
      [{ logline: 'Hero arrives', visualHook: 'Wide street' }, { logline: 'Door opens' }],
      10,
    )
    expect(shots).toHaveLength(2)
    expect(shots[0]?.duration).toBe(5)
    expect(shots[1]?.duration).toBe(5)
    expect(shots.reduce((sum, shot) => sum + shot.duration, 0)).toBe(10)
    expect(shots[0]?.prompt).toContain(StoryboardShotCut.First)
    expect(shots[0]?.prompt).toContain('Shot 1: Wide street')
    expect(shots[1]?.prompt).toContain(`${StoryboardShotLookTag.Storyboard}. Shot 2: Door opens`)
    expect(shots[1]?.prompt).not.toContain(StoryboardShotCut.First)
    expect(Object.keys(shots[0] ?? {}).sort()).toEqual(
      [KlingMultiPromptField.Duration, KlingMultiPromptField.Prompt].sort(),
    )
  })

  it('packs extra beats into at most six Kling shots', () => {
    const beats = Array.from({ length: 8 }, (_, index) => ({ logline: `Beat ${index + 1}` }))
    const shots = buildStoryboardMultiPrompt(beats, 15)
    expect(shots).toHaveLength(6)
    expect(shots.reduce((sum, shot) => sum + shot.duration, 0)).toBe(15)
    expect(klingShotDurations(6, 15)).toEqual([3, 3, 3, 2, 2, 2])
    expect(shots.every(shot => shot.prompt.length <= KLING_MULTI_PROMPT_SHOT_PROMPT_MAX_CHARS)).toBe(
      true,
    )
  })

  it('splits one beat across two shots when 15s exceeds the 12s per-shot cap', () => {
    const shots = buildStoryboardMultiPrompt([{ logline: 'Hero arrives' }], 15)
    expect(shots).toHaveLength(2)
    expect(shots.reduce((sum, shot) => sum + shot.duration, 0)).toBe(15)
    expect(shots.every(shot => shot.prompt.includes('Shot 1: Hero arrives'))).toBe(true)
  })
})

describe('storyboard core prompt', () => {
  it('uses the fast LLM summary when it returns text', async () => {
    const result = await generateStoryboardVideoCorePrompt(
      [{ logline: 'Hero arrives' }],
      async input => {
        expect(input.system).toBe(StoryboardCorePromptCopy.SystemStoryboard)
        expect(input.user).toContain('Shot 1: Hero arrives')
        return 'Play the numbered stills. Hero arrives at dawn.'
      },
    )
    expect(result.source).toBe(StoryboardCorePromptSource.Llm)
    expect(result.prompt).toContain(StoryboardLookLock.Storyboard)
    expect(result.prompt).toContain('Play the numbered stills. Hero arrives at dawn.')
  })

  it('falls back to the shot list when the LLM is empty', async () => {
    const result = await generateStoryboardVideoCorePrompt([{ logline: 'Hero arrives' }], async () => '')
    expect(result.source).toBe(StoryboardCorePromptSource.Fallback)
    expect(result.prompt).toContain('Shot 1: Hero arrives')
    expect(result.prompt).toContain(StoryboardLookLock.Storyboard)
  })
})

describe('storyboardKlingDirectorFields', () => {
  const beats = [{ logline: 'Hero arrives', visualHook: 'Wide street' }]

  it('omits timed shots for Seedance', () => {
    expect(
      storyboardKlingDirectorFields(
        ApiframeVideoModel.Seedance25,
        beats,
        30,
        StoryboardVideoLook.Storyboard,
      ),
    ).toEqual({})
  })

  it('keeps look-specific negative prompt and multi_prompt for Kling', () => {
    const fields = storyboardKlingDirectorFields(
      ApiframeVideoModel.Kling30,
      beats,
      10,
      StoryboardVideoLook.Storyboard,
    )
    expect(fields.negativePrompt).toBe(storyboardLookNegative(StoryboardVideoLook.Storyboard))
    expect(fields.multiPrompt).toEqual([
      {
        duration: 10,
        prompt: `${StoryboardShotLookTag.Storyboard}. ${StoryboardShotCut.First} Shot 1: Wide street`,
      },
    ])
  })
})
