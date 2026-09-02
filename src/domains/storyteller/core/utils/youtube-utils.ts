/**
 * YouTube URL parsing and format validation for soundtrack proposals.
 */

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

enum YoutubeUrlHost {
  Short = 'youtu.be',
  Watch = 'youtube.com',
  WatchWww = 'www.youtube.com',
  Music = 'music.youtube.com',
  YoutubeSuffix = '.youtube.com',
}

export enum SoundtrackValidationPlaceholder {
  MissingYoutubeUrl = '(missing youtubeUrl)',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch?.[1]) return shortMatch[1]

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch?.[1]) return watchMatch[1]

  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch?.[1]) return embedMatch[1]

  const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch?.[1]) return shortsMatch[1]

  return null
}

/** True when the string is an http(s) YouTube URL with a parsable 11-char video id. */
export function isValidYoutubeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    const allowed =
      host === YoutubeUrlHost.Short ||
      host === YoutubeUrlHost.Watch ||
      host === YoutubeUrlHost.WatchWww ||
      host === YoutubeUrlHost.Music ||
      host.endsWith(YoutubeUrlHost.YoutubeSuffix)
    if (!allowed) return false
  } catch {
    return false
  }
  const id = extractVideoId(trimmed)
  return id !== null && YOUTUBE_ID_PATTERN.test(id)
}

/** Canonical watch URL, or null when the input is not a valid YouTube link. */
export function canonicalizeYoutubeUrl(url: string | null | undefined): string | null {
  const id = extractVideoId(url)
  if (!id || !isValidYoutubeUrl(url)) return null
  return `https://www.youtube.com/watch?v=${id}`
}

export interface ValidatedSoundtrackTrack {
  title: string
  artist: string
  youtubeUrl: string
  mood?: string
}

/** Keep only tracks with non-empty title/artist and a valid YouTube URL (canonicalized). */
export function filterValidSoundtrackTracks(
  tracks: unknown
): { valid: ValidatedSoundtrackTrack[]; invalidUrls: string[] } {
  if (!Array.isArray(tracks)) return { valid: [], invalidUrls: [] }
  const valid: ValidatedSoundtrackTrack[] = []
  const invalidUrls: string[] = []
  for (const entry of tracks) {
    if (!isRecord(entry)) continue
    const title = typeof entry.title === 'string' ? entry.title.trim() : ''
    const artist = typeof entry.artist === 'string' ? entry.artist.trim() : ''
    const rawUrl = typeof entry.youtubeUrl === 'string' ? entry.youtubeUrl.trim() : ''
    const canonical = canonicalizeYoutubeUrl(rawUrl)
    if (!title || !artist || !canonical) {
      if (rawUrl) invalidUrls.push(rawUrl)
      else if (title || artist) invalidUrls.push(SoundtrackValidationPlaceholder.MissingYoutubeUrl)
      continue
    }
    const mood = typeof entry.mood === 'string' ? entry.mood.trim() : undefined
    valid.push(
      mood
        ? { title, artist, youtubeUrl: canonical, mood }
        : { title, artist, youtubeUrl: canonical }
    )
  }
  return { valid, invalidUrls }
}
