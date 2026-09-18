import { describe, expect, it } from 'vitest'
import { ApiframeGenerateAspectRatio, MIDJOURNEY_VERSION } from '@/shared/ai/utils/apiframe'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { MOODBOARD_PROMPT_SUFFIX } from '../utils/moodboard-task-wire'
import { LockedVisualConceptArt, buildPosterMidjourneyLockFlags } from '../utils/locked-visual-prompt'
import { StorytellerLookSrefUrl } from '../utils/storyteller-look-sref'
import {
  EpisodePosterBasePhrase,
  EpisodePosterPromptLock,
  buildEpisodePosterPrompt,
} from '../utils/episode-poster-prompt'

describe('buildEpisodePosterPrompt', () => {
  it('returns null when the scene is empty', () => {
    expect(buildEpisodePosterPrompt('')).toBeNull()
    expect(buildEpisodePosterPrompt('   ')).toBeNull()
  })

  it('prefixes the moodboard base with the movie poster lock', () => {
    const prompt = buildEpisodePosterPrompt('keeper last lamp')
    expect(prompt).toBe(
      `${EpisodePosterPromptLock.Prefix} keeper last lamp ${EpisodePosterPromptLock.Base}`,
    )
    expect(EpisodePosterPromptLock.Base).toBe(
      MOODBOARD_PROMPT_SUFFIX.replace(
        LockedVisualConceptArt.Phrase,
        EpisodePosterBasePhrase.To,
      ),
    )
    expect(EpisodePosterPromptLock.Base).not.toContain(LockedVisualConceptArt.Phrase)
  })
})

describe('buildPosterMidjourneyLockFlags', () => {
  it('appends version, 2:3 aspect, and the look --sref pair', () => {
    const locked = `${EpisodePosterPromptLock.Prefix} keeper last lamp ${EpisodePosterPromptLock.Base}`
    expect(buildPosterMidjourneyLockFlags(locked)).toBe(
      `${locked} ${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION} ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.PortraitTwoThree} ${MidjourneyParamFlag.StyleRef} ${StorytellerLookSrefUrl.One} ${StorytellerLookSrefUrl.Two}`,
    )
  })

  it('replaces the look key when the user selected style refs', () => {
    const locked = `${EpisodePosterPromptLock.Prefix} keeper last lamp ${EpisodePosterPromptLock.Base}`
    const userRef = 'https://cdn.example/user.png'
    const prompt = buildPosterMidjourneyLockFlags(locked, [userRef])
    expect(prompt).toContain(`${MidjourneyParamFlag.StyleRef} ${userRef}`)
    expect(prompt).not.toContain(StorytellerLookSrefUrl.One)
    expect(prompt).not.toContain(StorytellerLookSrefUrl.Two)
  })
})
