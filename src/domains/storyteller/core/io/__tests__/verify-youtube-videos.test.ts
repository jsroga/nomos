import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkYoutubeVideo,
  metadataMatchesTrack,
  verifySoundtrackTracks,
} from '../verify-youtube-videos'

const LIVE_URL = 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
const DEAD_URL = 'https://www.youtube.com/watch?v=bbbbbbbbbbb'
const WRONG_URL = 'https://www.youtube.com/watch?v=ccccccccccc'

function track(youtubeUrl: string, title = 'Ashes', artist = 'Vex') {
  return { title, artist, youtubeUrl }
}

interface StubEntry {
  status: number
  title?: string
  author?: string
}

function stubFetch(lookup: (url: string) => StubEntry) {
  const impl: typeof fetch = async input => {
    const entry = lookup(String(input))
    return new Response(
      JSON.stringify({ title: entry.title ?? '', author_name: entry.author ?? '' }),
      { status: entry.status, headers: { 'content-type': 'application/json' } }
    )
  }
  vi.stubGlobal('fetch', vi.fn(impl))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('metadataMatchesTrack', () => {
  it('matches when the video title contains the track title', () => {
    expect(metadataMatchesTrack('Ashes', 'Vex', 'Vex - Ashes (Official Video)', 'VexVEVO')).toBe(true)
  })

  it('matches on the channel name when the title is styled differently', () => {
    expect(metadataMatchesTrack('Ashes', 'Vex', 'ASHES // official', 'Vex')).toBe(true)
  })

  it('ignores punctuation and casing', () => {
    expect(metadataMatchesTrack('Ashes!', 'Vex', 'ashes', 'someone')).toBe(true)
  })

  it('rejects a completely unrelated video', () => {
    expect(metadataMatchesTrack('Ashes', 'Vex', 'Cat compilation 2019', 'Cats Daily')).toBe(false)
  })
})

describe('checkYoutubeVideo', () => {
  it('reports a 4xx as a missing video', async () => {
    stubFetch(() => ({ status: 404 }))
    const check = await checkYoutubeVideo(DEAD_URL)
    expect(check.exists).toBe(false)
    expect(check.inconclusive).toBe(false)
  })

  it('reports a network failure as inconclusive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const check = await checkYoutubeVideo(LIVE_URL)
    expect(check.inconclusive).toBe(true)
  })

  it('reports a 5xx as inconclusive rather than missing', async () => {
    stubFetch(() => ({ status: 503 }))
    const check = await checkYoutubeVideo(LIVE_URL)
    expect(check.exists).toBe(true)
    expect(check.inconclusive).toBe(true)
  })
})

describe('verifySoundtrackTracks', () => {
  it('drops invented ids that resolve to nothing', async () => {
    stubFetch(url =>
      url.includes('bbbbbbbbbbb')
        ? { status: 404 }
        : { status: 200, title: 'Vex - Ashes', author: 'Vex' }
    )
    const { live, dead } = await verifySoundtrackTracks([track(LIVE_URL), track(DEAD_URL)])
    expect(live).toHaveLength(1)
    expect(dead).toHaveLength(1)
  })

  it('drops a live link that points at an unrelated video', async () => {
    stubFetch(() => ({ status: 200, title: 'Cat compilation 2019', author: 'Cats Daily' }))
    const { live, dead } = await verifySoundtrackTracks([track(WRONG_URL)])
    expect(live).toEqual([])
    expect(dead[0]).toContain('Cat compilation 2019')
  })

  it('keeps every track when the check is inconclusive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const { live, dead } = await verifySoundtrackTracks([track(LIVE_URL), track(DEAD_URL)])
    expect(live).toHaveLength(2)
    expect(dead).toEqual([])
  })
})
