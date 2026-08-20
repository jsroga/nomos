import { describe, expect, it } from 'vitest'
import { ApiframeGenerateAspectRatio, MIDJOURNEY_VERSION } from '@/shared/ai/constants/apiframe'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { MOODBOARD_PROMPT_SUFFIX } from '../constants/moodboard-task-wire'
import { LockedVisualConceptArt } from '../constants/locked-visual-prompt'
import {
  buildCharacterPortraitPrompt,
  CharacterPortraitBasePhrase,
  CharacterPortraitPromptLock,
} from '../constants/character-portrait-prompt'
import {
  buildPortraitMidjourneyPrompt,
  isPortraitCharacterUuid,
} from '../constants/generate-portrait-wire'
import { StorytellerLookSrefUrl } from '../constants/storyteller-look-sref'

describe('buildCharacterPortraitPrompt', () => {
  it('returns null when the scene is empty or whitespace', () => {
    expect(buildCharacterPortraitPrompt('')).toBeNull()
    expect(buildCharacterPortraitPrompt('   ')).toBeNull()
  })

  it('prefixes the moodboard base with the portrait lock and a 5-word scene', () => {
    const prompt = buildCharacterPortraitPrompt('hooded cliff keeper')
    expect(prompt).toBe(
      `${CharacterPortraitPromptLock.Prefix} hooded cliff keeper ${CharacterPortraitPromptLock.Base}`,
    )
    expect(CharacterPortraitPromptLock.Base).toBe(
      MOODBOARD_PROMPT_SUFFIX.replace(
        LockedVisualConceptArt.Phrase,
        CharacterPortraitBasePhrase.To,
      ),
    )
    expect(CharacterPortraitPromptLock.Base).toContain(CharacterPortraitBasePhrase.To)
    expect(CharacterPortraitPromptLock.Base).not.toContain(LockedVisualConceptArt.Phrase)
  })

  it('clamps the scene to five words', () => {
    const prompt = buildCharacterPortraitPrompt(
      'hooded cliff keeper above a black basalt coast',
    )
    expect(prompt).toBe(
      `${CharacterPortraitPromptLock.Prefix} hooded cliff keeper above a ${CharacterPortraitPromptLock.Base}`,
    )
  })
})

describe('buildPortraitMidjourneyPrompt', () => {
  it('appends version, square aspect, and the look --sref pair', () => {
    const prompt = buildPortraitMidjourneyPrompt(
      `${CharacterPortraitPromptLock.Prefix} hooded cliff keeper ${CharacterPortraitPromptLock.Base}`,
    )
    expect(prompt).toBe(
      `${CharacterPortraitPromptLock.Prefix} hooded cliff keeper ${CharacterPortraitPromptLock.Base} ${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION} ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.Square} ${MidjourneyParamFlag.StyleRef} ${StorytellerLookSrefUrl.One} ${StorytellerLookSrefUrl.Two}`,
    )
  })
})

describe('isPortraitCharacterUuid', () => {
  it('accepts a real UUID and rejects temp or new ids', () => {
    expect(isPortraitCharacterUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isPortraitCharacterUuid('temp-1787124763552')).toBe(false)
    expect(isPortraitCharacterUuid('new')).toBe(false)
    expect(isPortraitCharacterUuid(undefined)).toBe(false)
  })
})
