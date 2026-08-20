import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { PosterEpisodeUrlField } from '../constants/poster-generation-service'
import { assignLatestPosterUrl, isNewerPosterUrl, preferLatestPosterUrl, readEpisodePosterUrl, shouldSettleStoredPosterRun } from '../poster-url-from-episode'

describe('readEpisodePosterUrl', () => {
  it('reads camelCase posterUrl from the episode row', () => {
    expect(readEpisodePosterUrl({ [PosterEpisodeUrlField.Camel]: 'https://blob.example/p.png' })).toBe(
      'https://blob.example/p.png',
    )
  })

  it('reads snake_case poster_url from the episode row', () => {
    expect(readEpisodePosterUrl({ [PosterEpisodeUrlField.Snake]: 'https://blob.example/p.png' })).toBe(
      'https://blob.example/p.png',
    )
  })

  it('returns null when the episode has no poster', () => {
    expect(readEpisodePosterUrl({ id: 'ep-1' })).toBeNull()
  })
})

describe('isNewerPosterUrl', () => {
  it('accepts any saved url when there was no previous poster', () => {
    expect(isNewerPosterUrl(`${UrlScheme.Https}://blob.example/new.png`, '')).toBe(true)
    expect(isNewerPosterUrl(`${UrlScheme.Https}://blob.example/new.png`, undefined)).toBe(true)
  })

  it('rejects the baseline url from before this generation', () => {
    const previous = `${UrlScheme.Https}://blob.example/old.png`
    expect(isNewerPosterUrl(previous, previous)).toBe(false)
  })

  it('accepts a different url after regeneration', () => {
    expect(
      isNewerPosterUrl(
        `${UrlScheme.Https}://blob.example/new.png`,
        `${UrlScheme.Https}://blob.example/old.png`,
      ),
    ).toBe(true)
  })
})

describe('preferLatestPosterUrl', () => {
  const older = `${UrlScheme.Https}://blob.example/poster_ep_1710000000000.png`
  const newer = `${UrlScheme.Https}://blob.example/poster_ep_1710000007000.png`

  it('keeps the current poster when incoming is missing', () => {
    expect(preferLatestPosterUrl(newer, undefined)).toBe(newer)
  })

  it('does not replace a newer generated poster with an older one', () => {
    expect(preferLatestPosterUrl(newer, older)).toBe(newer)
  })

  it('accepts an incoming poster with a later timestamp', () => {
    expect(preferLatestPosterUrl(older, newer)).toBe(newer)
  })

  it('does not clobber an existing poster with an older incoming url', () => {
    expect(assignLatestPosterUrl({ posterUrl: newer }, older)?.posterUrl).toBe(newer)
  })
})

describe('shouldSettleStoredPosterRun', () => {
  const saved = `${UrlScheme.Https}://blob.example/new.png`

  it('settles when the trigger run already succeeded', () => {
    expect(
      shouldSettleStoredPosterRun({
        savedPosterUrl: null,
        baselinePosterUrl: saved,
        runSucceeded: true,
      }),
    ).toBe(true)
  })

  it('settles when the episode already has a newer poster', () => {
    expect(
      shouldSettleStoredPosterRun({
        savedPosterUrl: saved,
        baselinePosterUrl: '',
        runSucceeded: false,
      }),
    ).toBe(true)
  })

  it('keeps polling when the saved poster is still the baseline', () => {
    expect(
      shouldSettleStoredPosterRun({
        savedPosterUrl: saved,
        baselinePosterUrl: saved,
        runSucceeded: false,
      }),
    ).toBe(false)
  })
})
