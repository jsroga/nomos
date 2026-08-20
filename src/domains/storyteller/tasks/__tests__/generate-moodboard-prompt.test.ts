import { describe, expect, it } from 'vitest'
import {
  ApiframeGenerateAspectRatio,
  MIDJOURNEY_VERSION,
} from '@/shared/ai/constants/apiframe'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { MoodboardFallbackScene, lockedMoodboardPromptsOrNull } from '../build-moodboard-locked-prompts'
import { buildMoodboardMidjourneyPrompt } from '../generate-moodboard-run'
import {
  MOODBOARD_PROMPT_SUFFIX,
  MoodboardSceneWrap,
  clampMoodboardSceneWords,
  firstMoodboardStyleRefUrl,
  moodboardStyleReferenceForPrompt,
  wrapMoodboardScene,
} from '../constants/moodboard-task-wire'
import { StorytellerLookSrefUrl } from '../constants/storyteller-look-sref'

describe('lockedMoodboardPromptsOrNull', () => {
  it('keeps already-built prompts so the job can skip the LLM', () => {
    expect(lockedMoodboardPromptsOrNull([MoodboardFallbackScene.Environment])).toEqual([
      MoodboardFallbackScene.Environment,
    ])
  })

  it('returns null when the client sent an empty prompt list', () => {
    expect(lockedMoodboardPromptsOrNull([])).toBeNull()
    expect(lockedMoodboardPromptsOrNull(undefined)).toBeNull()
  })
})

describe('buildMoodboardMidjourneyPrompt', () => {
  const lookSref = `${MidjourneyParamFlag.StyleRef} ${StorytellerLookSrefUrl.One} ${StorytellerLookSrefUrl.Two}`

  it('wraps a short scene and appends the look --sref pair', () => {
    const prompt = buildMoodboardMidjourneyPrompt('basalt cliff lighthouse')
    expect(prompt).toBe(
      `${MoodboardSceneWrap.Open}basalt cliff lighthouse${MoodboardSceneWrap.Close} ${MOODBOARD_PROMPT_SUFFIX} ${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION} ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.Widescreen} ${lookSref}`,
    )
  })

  it('keeps the look key first when a later tile also has a moodboard sref', () => {
    const keyUrl = 'https://cdn.example/key.png'
    const prompt = buildMoodboardMidjourneyPrompt('harbor market', keyUrl)
    expect(prompt).toContain(`${lookSref} ${keyUrl}`)
  })
})

describe('wrapMoodboardScene', () => {
  it('clamps to five words and wraps with emphasis markers', () => {
    expect(
      wrapMoodboardScene(
        'An ancient lighthouse carved into a black basalt cliff above a storm',
      ),
    ).toBe(
      `${MoodboardSceneWrap.Open}An ancient lighthouse carved into${MoodboardSceneWrap.Close} ${MOODBOARD_PROMPT_SUFFIX}`,
    )
  })
})

describe('clampMoodboardSceneWords', () => {
  it('keeps at most five words', () => {
    expect(clampMoodboardSceneWords('one two three four five six')).toBe(
      'one two three four five',
    )
  })
})

const KEY_IMAGE_URL = 'https://cdn.example/key.png'

describe('firstMoodboardStyleRefUrl', () => {
  it('returns the first public https image', () => {
    expect(
      firstMoodboardStyleRefUrl(['mood_local.png', KEY_IMAGE_URL, 'https://cdn.example/later.png']),
    ).toBe(KEY_IMAGE_URL)
  })
})

describe('moodboardStyleReferenceForPrompt', () => {
  it('skips sref for the first batch image and for regenerating the key', () => {
    expect(
      moodboardStyleReferenceForPrompt({
        replaceIndex: undefined,
        promptOffset: 0,
        keyImageUrl: KEY_IMAGE_URL,
      }),
    ).toBeUndefined()
    expect(
      moodboardStyleReferenceForPrompt({
        replaceIndex: 0,
        promptOffset: 0,
        keyImageUrl: KEY_IMAGE_URL,
      }),
    ).toBeUndefined()
  })

  it('uses the key image for later batch and regen tiles', () => {
    expect(
      moodboardStyleReferenceForPrompt({
        replaceIndex: undefined,
        promptOffset: 1,
        keyImageUrl: KEY_IMAGE_URL,
      }),
    ).toBe(KEY_IMAGE_URL)
    expect(
      moodboardStyleReferenceForPrompt({
        replaceIndex: 2,
        promptOffset: 0,
        keyImageUrl: KEY_IMAGE_URL,
      }),
    ).toBe(KEY_IMAGE_URL)
  })
})
