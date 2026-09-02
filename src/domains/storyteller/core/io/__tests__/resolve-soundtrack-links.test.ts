import { afterEach, describe, expect, it, vi } from 'vitest'

const searchMock = vi.hoisted(() => vi.fn())
vi.mock('youtube-search-api', () => ({ GetListByKeyword: searchMock }))

const { pickBestCandidate, resolveSoundtrackTracks } = await import('../resolve-soundtrack-links')

const INVENTED_URL = 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
const REAL_ID = 'dQw4w9WgXcQ'

function track(title = 'Never Gonna Give You Up', artist = 'Rick Astley') {
  return { title, artist, youtubeUrl: INVENTED_URL }
}

function videoItem(id: string, title: string, channelTitle: string) {
  return { id, type: 'video', title, channelTitle }
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('pickBestCandidate', () => {
  it('prefers a hit whose title matches over the top hit', () => {
    const best = pickBestCandidate(track(), [
      { id: 'wrongwrong1', title: 'Some unrelated upload', channel: 'Randoms' },
      { id: REAL_ID, title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley' },
    ])
    expect(best?.id).toBe(REAL_ID)
  })

  it('refuses a top hit that is a different song by the same artist', () => {
    // The real failure: "O Children" resolved to "Into My Arms" — same band,
    // wrong song, live link, looked fine until played.
    const best = pickBestCandidate(track('O Children', 'Nick Cave & The Bad Seeds'), [
      { id: 'intomyarms', title: 'Nick Cave - Into My Arms', channel: 'Nick Cave' },
    ])
    expect(best).toBeNull()
  })

  it('prefers the hit that names both song and artist', () => {
    const best = pickBestCandidate(track(), [
      { id: 'titleonly01', title: 'Never Gonna Give You Up (cover)', channel: 'Some Coverer' },
      { id: REAL_ID, title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley' },
    ])
    expect(best?.id).toBe(REAL_ID)
  })

  it('returns null when the search found nothing', () => {
    expect(pickBestCandidate(track(), [])).toBeNull()
  })
})

describe('resolveSoundtrackTracks', () => {
  it('replaces an invented id with the real one from search', async () => {
    searchMock.mockResolvedValue({
      items: [videoItem(REAL_ID, 'Rick Astley - Never Gonna Give You Up', 'Rick Astley')],
    })
    const { resolved, unresolved } = await resolveSoundtrackTracks([track()])
    expect(resolved[0]?.youtubeUrl).toBe(`https://www.youtube.com/watch?v=${REAL_ID}`)
    expect(unresolved).toEqual([])
  })

  it('keeps title, artist and mood while swapping only the link', async () => {
    searchMock.mockResolvedValue({
      items: [videoItem(REAL_ID, 'Rick Astley - Never Gonna Give You Up', 'Rick Astley')],
    })
    const input = { ...track(), mood: 'defiant' }
    const { resolved } = await resolveSoundtrackTracks([input])
    expect(resolved[0]).toMatchObject({
      title: input.title,
      artist: input.artist,
      mood: 'defiant',
    })
  })

  it('ignores non-video results such as channels', async () => {
    searchMock.mockResolvedValue({
      items: [
        { id: 'channelid01', type: 'channel', title: 'Rick Astley' },
        videoItem(REAL_ID, 'Rick Astley - Never Gonna Give You Up', 'Rick Astley'),
      ],
    })
    const { resolved } = await resolveSoundtrackTracks([track()])
    expect(resolved[0]?.youtubeUrl).toContain(REAL_ID)
  })

  it('reports a track as unresolved when search finds nothing and the link is dead', async () => {
    searchMock.mockResolvedValue({ items: [] })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    const { resolved, unresolved } = await resolveSoundtrackTracks([track()])
    expect(resolved).toEqual([])
    expect(unresolved[0]).toContain('Never Gonna Give You Up')
  })

  it('falls back to the proposed link when search breaks but the link is real', async () => {
    searchMock.mockRejectedValue(new Error('scraper broke'))
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ title: 'Never Gonna Give You Up', author_name: 'Rick Astley' }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      )
    )
    const { resolved, unresolved } = await resolveSoundtrackTracks([track()])
    expect(resolved[0]?.youtubeUrl).toBe(INVENTED_URL)
    expect(unresolved).toEqual([])
  })
})
