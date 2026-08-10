/**
 * Recover structured tracks from a chat answer so "Add to world" can persist a
 * soundtrack the agent only wrote as prose. Each track needs a quoted title, an
 * artist after the dash, and a YouTube link somewhere before the next title.
 */

const TITLE_AND_ARTIST = /["“„]([^"”“]+)["”][*_\s]*[—–-]\s*(.+)$/
const YOUTUBE_URL =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s)\]]*v=[\w-]+|youtu\.be\/[\w-]+)/
/** Trailing link label, markdown link, or link emoji that follows the artist. */
const ARTIST_TAIL = /(\s*[🔗(\[]|\s+https?:\/\/).*$/u

export interface ExtractedSoundtrackTrack {
  title: string
  artist: string
  youtubeUrl: string
}

function cleanArtist(raw: string): string {
  return raw.replace(ARTIST_TAIL, '').replace(/[\s,;·—–-]+$/u, '').trim()
}

export function extractSoundtrackTracks(text: string): ExtractedSoundtrackTrack[] {
  const tracks: ExtractedSoundtrackTrack[] = []
  let pending: { title: string; artist: string } | null = null

  const flush = (url: string): void => {
    if (!pending) return
    tracks.push({ title: pending.title, artist: pending.artist, youtubeUrl: url })
    pending = null
  }

  for (const line of text.split('\n')) {
    const heading = TITLE_AND_ARTIST.exec(line)
    if (heading) {
      const title = heading[1]?.trim() ?? ''
      const artist = cleanArtist(heading[2] ?? '')
      pending = title && artist ? { title, artist } : null
    }
    const url = YOUTUBE_URL.exec(line)
    if (url) flush(url[0])
  }

  return tracks
}
