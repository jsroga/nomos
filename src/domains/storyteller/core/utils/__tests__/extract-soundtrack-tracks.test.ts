import { describe, expect, it } from 'vitest'
import { extractSoundtrackTracks } from '../extract-soundtrack-tracks'

describe('extractSoundtrackTracks', () => {
  it('pulls title, artist and url from the numbered chat format', () => {
    const text = [
      '1. "Movement 6" — Floating Points, Pharoah Sanders & The London Symphony Orchestra 🔗 [YouTube](https://www.youtube.com/watch?v=EFEbLTvNqZI)',
      '',
      'Why it fits: A 2021 collaboration that fuses electronic production.',
      '',
      '2. "Pyramid Song" — Radiohead 🔗 [YouTube](https://youtu.be/M6W4uhrLA7g)',
    ].join('\n')

    expect(extractSoundtrackTracks(text)).toEqual([
      {
        title: 'Movement 6',
        artist: 'Floating Points, Pharoah Sanders & The London Symphony Orchestra',
        youtubeUrl: 'https://www.youtube.com/watch?v=EFEbLTvNqZI',
      },
      {
        title: 'Pyramid Song',
        artist: 'Radiohead',
        youtubeUrl: 'https://youtu.be/M6W4uhrLA7g',
      },
    ])
  })

  it('links a url that lands on a later line than the title', () => {
    const text = ['**"Spiegel im Spiegel"** — Arvo Pärt', 'https://www.youtube.com/watch?v=TJ6Mzvh3XCc'].join(
      '\n'
    )

    expect(extractSoundtrackTracks(text)).toEqual([
      {
        title: 'Spiegel im Spiegel',
        artist: 'Arvo Pärt',
        youtubeUrl: 'https://www.youtube.com/watch?v=TJ6Mzvh3XCc',
      },
    ])
  })

  it('ignores prose with no tracks', () => {
    expect(extractSoundtrackTracks('Here are some thoughts about the world.')).toEqual([])
  })

  it('skips a title whose url never arrives', () => {
    const text = ['1. "No Link Here" — Some Artist', '2. "Has Link" — Other 🔗 https://youtu.be/abc123DEFgh'].join(
      '\n'
    )

    expect(extractSoundtrackTracks(text)).toEqual([
      { title: 'Has Link', artist: 'Other', youtubeUrl: 'https://youtu.be/abc123DEFgh' },
    ])
  })
})
