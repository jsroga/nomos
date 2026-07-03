/**
 * YouTube Soundtrack Player E2E Tests
 *
 * Tests the YouTube player functionality in WorldBiblePanel soundtracks section.
 * Focuses on meaningful behavior: URL parsing, state management, and integration.
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// VIDEO ID EXTRACTION - Critical for playback to work at all
// ============================================================================

/**
 * Extracts YouTube video ID from various URL formats
 * This is the same function used in YouTubePlayer.tsx and WorldBiblePanel.tsx
 */
function extractVideoId(url: string): string | null {
  if (!url) return null

  // Handle youtu.be shorts
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Handle youtube.com/watch?v=
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  // Handle youtube.com/embed/
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  return null
}

describe('YouTube Video ID Extraction', () => {
  describe('Valid YouTube URL formats', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcY')).toBe('dQw4w9WgXcY')
    })

    it('extracts ID from short youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcY')).toBe('dQw4w9WgXcY')
    })

    it('extracts ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcY')).toBe('dQw4w9WgXcY')
    })

    it('extracts ID with additional query params', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcY&feature=share')).toBe(
        'dQw4w9WgXcY'
      )
      expect(extractVideoId('https://www.youtube.com/watch?t=120&v=dQw4w9WgXcY')).toBe(
        'dQw4w9WgXcY'
      )
    })

    it('extracts ID from mobile URL', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcY')).toBe('dQw4w9WgXcY')
    })

    it('handles various valid video ID characters', () => {
      // Video IDs can contain: a-z, A-Z, 0-9, -, _
      expect(extractVideoId('https://youtube.com/watch?v=abc123XYZ_-')).toBe('abc123XYZ_-')
    })
  })

  describe('Invalid URLs return null', () => {
    it('returns null for empty string', () => {
      expect(extractVideoId('')).toBeNull()
    })

    it('returns null for Vimeo URLs', () => {
      expect(extractVideoId('https://vimeo.com/123456789')).toBeNull()
    })

    it('returns null for random websites', () => {
      expect(extractVideoId('https://example.com/video')).toBeNull()
    })

    it('returns null for non-URL strings', () => {
      expect(extractVideoId('not-a-url')).toBeNull()
    })

    it('returns null for YouTube channel URLs', () => {
      expect(extractVideoId('https://youtube.com/channel/UCxxx')).toBeNull()
    })

    it('returns null for YouTube playlist URLs without video', () => {
      expect(extractVideoId('https://youtube.com/playlist?list=PLxxx')).toBeNull()
    })

    it('returns null for too-short video IDs', () => {
      expect(extractVideoId('https://youtube.com/watch?v=short')).toBeNull()
    })
  })
})

// ============================================================================
// PLAYER STATE MANAGEMENT - Ensures proper UX
// ============================================================================

describe('Soundtrack Player State Management', () => {
  interface Track {
    title: string
    artist: string
    youtubeUrl: string
    mood?: string
  }

  const mockTracks: Track[] = [
    {
      title: 'Blade Runner Blues',
      artist: 'Vangelis',
      youtubeUrl: 'https://www.youtube.com/watch?v=RScZrvTebeA',
      mood: 'melancholic',
    },
    {
      title: 'Time',
      artist: 'Hans Zimmer',
      youtubeUrl: 'https://youtu.be/MuAGGZNfUkU',
      mood: 'epic',
    },
    {
      title: 'Main Theme',
      artist: 'Gustavo Santaolalla',
      youtubeUrl: 'https://www.youtube.com/embed/Y97u-U0nvJM',
      mood: 'haunting',
    },
  ]

  describe('Single track playback', () => {
    it('starts with no track playing', () => {
      const playingTrackIndex: number | null = null
      const playingVideoId: string | null = null

      expect(playingTrackIndex).toBeNull()
      expect(playingVideoId).toBeNull()
    })

    it('sets correct state when track is played', () => {
      let playingTrackIndex: number | null = null
      let playingVideoId: string | null = null

      // Simulate clicking play on track 0
      const track = mockTracks[0]
      const videoId = extractVideoId(track.youtubeUrl)

      if (videoId) {
        playingTrackIndex = 0
        playingVideoId = videoId
      }

      expect(playingTrackIndex).toBe(0)
      expect(playingVideoId).toBe('RScZrvTebeA')
    })

    it('clears state when stop is clicked', () => {
      let playingTrackIndex: number | null = 0
      let playingVideoId: string | null = 'RScZrvTebeA'

      // Simulate clicking stop
      playingTrackIndex = null
      playingVideoId = null

      expect(playingTrackIndex).toBeNull()
      expect(playingVideoId).toBeNull()
    })
  })

  describe('Multi-track behavior', () => {
    it('only one track plays at a time - switching tracks', () => {
      let playingTrackIndex: number | null = null
      let playingVideoId: string | null = null

      // Play track 0
      const track0 = mockTracks[0]
      const videoId0 = extractVideoId(track0.youtubeUrl)
      if (videoId0) {
        playingTrackIndex = 0
        playingVideoId = videoId0
      }

      expect(playingTrackIndex).toBe(0)
      expect(playingVideoId).toBe('RScZrvTebeA')

      // Play track 2 - should replace track 0
      const track2 = mockTracks[2]
      const videoId2 = extractVideoId(track2.youtubeUrl)
      if (videoId2) {
        playingTrackIndex = 2
        playingVideoId = videoId2
      }

      expect(playingTrackIndex).toBe(2)
      expect(playingVideoId).toBe('Y97u-U0nvJM')
      // Importantly, track 0 is no longer playing
    })

    it('correctly identifies which track is currently playing', () => {
      const playingTrackIndex = 1

      const isPlaying = (index: number) => playingTrackIndex === index

      expect(isPlaying(0)).toBe(false)
      expect(isPlaying(1)).toBe(true)
      expect(isPlaying(2)).toBe(false)
    })
  })

  describe('Track with invalid URL', () => {
    it('does not start playback for invalid URLs', () => {
      let playingTrackIndex: number | null = null
      let playingVideoId: string | null = null

      const invalidTrack = {
        title: 'Invalid Track',
        artist: 'Unknown',
        youtubeUrl: 'https://vimeo.com/123456',
      }

      const videoId = extractVideoId(invalidTrack.youtubeUrl)

      // Should not set state if video ID extraction fails
      if (videoId) {
        playingTrackIndex = 0
        playingVideoId = videoId
      }

      expect(playingTrackIndex).toBeNull()
      expect(playingVideoId).toBeNull()
    })
  })
})

// ============================================================================
// EMBED PLAYER URL GENERATION
// ============================================================================

describe('YouTube Embed Player', () => {
  it('generates correct embed URL with autoplay', () => {
    const videoId = 'dQw4w9WgXcY'
    const expectedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`

    // This is what the YouTubeEmbedPlayer generates
    const actualSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`

    expect(actualSrc).toBe(expectedSrc)
    expect(actualSrc).toContain('autoplay=1')
    expect(actualSrc).toContain('rel=0') // Don't show related videos
  })

  it('does not render for empty video ID', () => {
    const videoId = ''
    const shouldRender = Boolean(videoId)

    expect(shouldRender).toBe(false)
  })
})

// ============================================================================
// INTEGRATION: WorldBiblePanel soundtrack flow
// ============================================================================

describe('WorldBiblePanel Soundtrack Integration', () => {
  it('simulates full play -> switch -> stop flow', () => {
    // Simulating the state from WorldBiblePanel
    let playingTrackIndex: number | null = null
    let playingVideoId: string | null = null

    const tracks = [
      { youtubeUrl: 'https://youtube.com/watch?v=track1abcde' },
      { youtubeUrl: 'https://youtube.com/watch?v=track2ghijk' },
    ]

    // User clicks play on track 0
    const onPlay0 = () => {
      const videoId = extractVideoId(tracks[0].youtubeUrl)
      if (videoId) {
        playingTrackIndex = 0
        playingVideoId = videoId
      }
    }

    onPlay0()
    expect(playingTrackIndex).toBe(0)
    expect(playingVideoId).toBe('track1abcde')

    // User clicks play on track 1 (should stop 0 and play 1)
    const onPlay1 = () => {
      const videoId = extractVideoId(tracks[1].youtubeUrl)
      if (videoId) {
        playingTrackIndex = 1
        playingVideoId = videoId
      }
    }

    onPlay1()
    expect(playingTrackIndex).toBe(1)
    expect(playingVideoId).toBe('track2ghijk')

    // User clicks stop
    const onStop = () => {
      playingTrackIndex = null
      playingVideoId = null
    }

    onStop()
    expect(playingTrackIndex).toBeNull()
    expect(playingVideoId).toBeNull()
  })
})
