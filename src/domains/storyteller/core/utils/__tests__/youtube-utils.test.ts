import { describe, expect, it } from 'vitest'
import {
  canonicalizeYoutubeUrl,
  extractVideoId,
  filterValidSoundtrackTracks,
  isValidYoutubeUrl,
  SoundtrackValidationPlaceholder,
} from '../youtube-utils'

describe('youtube-utils', () => {
  it('extracts ids from common URL shapes', () => {
    expect(extractVideoId('https://youtu.be/M6W4uhrLA7g')).toBe('M6W4uhrLA7g')
    expect(extractVideoId('https://www.youtube.com/watch?v=M6W4uhrLA7g')).toBe('M6W4uhrLA7g')
    expect(extractVideoId('https://www.youtube.com/embed/M6W4uhrLA7g')).toBe('M6W4uhrLA7g')
    expect(extractVideoId('https://www.youtube.com/shorts/M6W4uhrLA7g')).toBe('M6W4uhrLA7g')
  })

  it('rejects non-youtube or malformed urls', () => {
    expect(isValidYoutubeUrl('https://example.com/watch?v=M6W4uhrLA7g')).toBe(false)
    expect(isValidYoutubeUrl('youtu.be/M6W4uhrLA7g')).toBe(false)
    expect(isValidYoutubeUrl('https://youtu.be/short')).toBe(false)
    expect(isValidYoutubeUrl('not a url')).toBe(false)
  })

  it('canonicalizes valid urls', () => {
    expect(canonicalizeYoutubeUrl('https://youtu.be/M6W4uhrLA7g')).toBe(
      'https://www.youtube.com/watch?v=M6W4uhrLA7g'
    )
  })

  it('filters soundtrack tracks to valid youtube urls only', () => {
    const { valid, invalidUrls } = filterValidSoundtrackTracks([
      { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
      { title: 'Fake', artist: 'B', youtubeUrl: 'https://example.com/x' },
      { title: 'Missing', artist: 'C', youtubeUrl: '' },
    ])
    expect(valid).toEqual([
      {
        title: 'Theme',
        artist: 'A',
        youtubeUrl: 'https://www.youtube.com/watch?v=M6W4uhrLA7g',
      },
    ])
    expect(invalidUrls).toContain('https://example.com/x')
    expect(invalidUrls).toContain(SoundtrackValidationPlaceholder.MissingYoutubeUrl)
  })
})
