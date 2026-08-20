import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { resolveFullPosterUrl } from '../utils/resolve-full-poster-url'

describe('resolveFullPosterUrl', () => {
  it('prefers the story-plan poster over a stale local premise poster', () => {
    expect(
      resolveFullPosterUrl(
        `${UrlScheme.Https}://blob.example/old.png`,
        `${UrlScheme.Https}://blob.example/new.png`,
        'project-1',
      ),
    ).toBe(`${UrlScheme.Https}://blob.example/new.png`)
  })

  it('falls back to the local premise poster when the plan has none', () => {
    expect(
      resolveFullPosterUrl(`${UrlScheme.Https}://blob.example/local.png`, null, 'project-1'),
    ).toBe(`${UrlScheme.Https}://blob.example/local.png`)
  })

  it('keeps a newer generated poster when the local premise still has an older file', () => {
    expect(
      resolveFullPosterUrl(
        `${UrlScheme.Https}://blob.example/poster_ep_1710000000000.png`,
        `${UrlScheme.Https}://blob.example/poster_ep_1710000007000.png`,
        'project-1',
      ),
    ).toBe(`${UrlScheme.Https}://blob.example/poster_ep_1710000007000.png`)
  })
})
