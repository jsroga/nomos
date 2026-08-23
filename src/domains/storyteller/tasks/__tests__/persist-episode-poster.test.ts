import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { resolveDurablePublicImageUrl } from '../persist-generated-image'
import { isPosterDbWriteConfirmed, mergeStoryPlanPosterUrl } from '../persist-episode-poster-db'
import { GeneratePosterColumn, GeneratePosterPlanField } from '../constants/generate-poster-wire'
import { lockedPosterPromptOrNull } from '../build-episode-poster-locked-prompt'
import { EpisodePosterPromptLock } from '../constants/episode-poster-prompt'

describe('resolveDurablePublicImageUrl', () => {
  it('keeps a hosted https persist URL', () => {
    expect(
      resolveDurablePublicImageUrl(
        `${UrlScheme.Https}://blob.example/poster.png`,
        `${UrlScheme.Https}://cdn.midjourney/source.png`,
      ),
    ).toBe(`${UrlScheme.Https}://blob.example/poster.png`)
  })

  it('falls back to the source https URL when persist is a local path', () => {
    expect(
      resolveDurablePublicImageUrl(
        '/projects/abc/poster.png',
        `${UrlScheme.Https}://cdn.midjourney/source.png`,
      ),
    ).toBe(`${UrlScheme.Https}://cdn.midjourney/source.png`)
  })
})

describe('isPosterDbWriteConfirmed', () => {
  it('accepts the written poster_url', () => {
    expect(
      isPosterDbWriteConfirmed(
        { [GeneratePosterColumn.PosterUrl]: `${UrlScheme.Https}://blob.example/p.png` },
        `${UrlScheme.Https}://blob.example/p.png`,
      ),
    ).toBe(true)
  })

  it('rejects a missing or mismatched row', () => {
    expect(isPosterDbWriteConfirmed(null, `${UrlScheme.Https}://blob.example/p.png`)).toBe(false)
    expect(
      isPosterDbWriteConfirmed(
        { [GeneratePosterColumn.PosterUrl]: `${UrlScheme.Https}://blob.example/other.png` },
        `${UrlScheme.Https}://blob.example/p.png`,
      ),
    ).toBe(false)
  })
})

describe('mergeStoryPlanPosterUrl', () => {
  it('writes posterUrl onto the episode story plan jsonb', () => {
    const next = mergeStoryPlanPosterUrl(
      { title: 'Ep 1', posterUrl: `${UrlScheme.Https}://blob.example/old.png` },
      `${UrlScheme.Https}://blob.example/new.png`,
    )
    expect(next[GeneratePosterPlanField.PosterUrl]).toBe(`${UrlScheme.Https}://blob.example/new.png`)
    expect(next.title).toBe('Ep 1')
  })

  it('does not copy soundtrack onto the episode story plan', () => {
    const next = mergeStoryPlanPosterUrl(
      {
        title: 'Ep 1',
        soundtracks: [{ title: 'Theme', artist: 'A', youtubeUrl: `${UrlScheme.Https}://youtu.be/M6W4uhrLA7g` }],
      },
      `${UrlScheme.Https}://blob.example/new.png`,
    )
    expect(next.soundtracks).toBeUndefined()
    expect(next.title).toBe('Ep 1')
  })
})

describe('lockedPosterPromptOrNull', () => {
  it('returns the prompt when it already has the movie poster lock', () => {
    const locked = `${EpisodePosterPromptLock.Prefix} keeper last lamp`
    expect(lockedPosterPromptOrNull(locked)).toBe(locked)
  })

  it('returns null for a client theme string', () => {
    expect(lockedPosterPromptOrNull('Title: The Lamp. Theme: cinematic.')).toBeNull()
  })
})
