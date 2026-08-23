/**
 * Liveness check for proposed soundtrack links.
 *
 * `isValidYoutubeUrl` only proves a URL is well-formed — an 11-char id. Models
 * reliably invent ids in exactly that shape, so every proposed track can parse
 * and still be "This video isn't available any more". YouTube's oEmbed endpoint
 * answers whether a video actually exists, needs no API key and no quota, and
 * returns 200 for a playable video / 4xx for a dead or private one.
 */

import type { ValidatedSoundtrackTrack } from '@/domains/storyteller/core/utils/youtube-utils'

const OEMBED_ENDPOINT = 'https://www.youtube.com/oembed'
const OEMBED_FORMAT = 'json'
/** Per-request cap; a regenerate proposes a handful of tracks, not hundreds. */
const VERIFY_TIMEOUT_MS = 5_000

enum OembedQueryParam {
  Url = 'url',
  Format = 'format',
}

/** Fields of the oEmbed JSON payload. */
enum OembedField {
  Title = 'title',
  AuthorName = 'author_name',
}

export interface VerifiedSoundtrackTracks {
  live: ValidatedSoundtrackTrack[]
  dead: string[]
}

function oembedUrlFor(watchUrl: string): string {
  const url = new URL(OEMBED_ENDPOINT)
  url.searchParams.set(OembedQueryParam.Url, watchUrl)
  url.searchParams.set(OembedQueryParam.Format, OEMBED_FORMAT)
  return url.toString()
}

/** Lowercase alphanumerics only, so punctuation/casing never decides a match. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * True when the video YouTube actually returned is plausibly the track claimed.
 *
 * A 200 only proves *some* video exists at that id. An invented id can land on
 * a real but unrelated video, which is worse than a dead link because nothing
 * looks wrong until you play it. oEmbed hands back the real title and channel,
 * so require one of them to line up with what the model claimed.
 */
export function trackMatchScore(
  claimedTitle: string,
  claimedArtist: string,
  actualTitle: string,
  actualAuthor: string
): number {
  const wantTitle = normalize(claimedTitle)
  if (!wantTitle) return 0

  // The song title must appear. Matching on artist alone picked "Into My Arms"
  // for "O Children" — same band, wrong song, and it looks correct until played.
  const title = normalize(actualTitle)
  if (!title.includes(wantTitle)) return 0

  // Artist is confidence, not a gate: "Artist - Title (Official Video)" puts it
  // in the title, a Topic channel puts it in the channel name, and a legitimate
  // live or remastered upload may carry neither.
  const wantArtist = normalize(claimedArtist)
  const author = normalize(actualAuthor)
  const artistMatches =
    Boolean(wantArtist) && (author.includes(wantArtist) || title.includes(wantArtist))
  return artistMatches ? 2 : 1
}

export function metadataMatchesTrack(
  claimedTitle: string,
  claimedArtist: string,
  actualTitle: string,
  actualAuthor: string
): boolean {
  return trackMatchScore(claimedTitle, claimedArtist, actualTitle, actualAuthor) > 0
}

export interface YoutubeVideoCheck {
  /** False only on an explicit 4xx — the video is gone or not embeddable. */
  exists: boolean
  title: string
  author: string
  /** True when the check itself failed; callers must not delete tracks on this. */
  inconclusive: boolean
}

/**
 * Ask YouTube's oEmbed endpoint about a video.
 *
 * A network/timeout failure is reported as inconclusive rather than missing: a
 * transient outage must never delete the user's tracks.
 */
export async function checkYoutubeVideo(watchUrl: string): Promise<YoutubeVideoCheck> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
  try {
    const response = await fetch(oembedUrlFor(watchUrl), { signal: controller.signal })
    if (response.status >= 400 && response.status < 500) {
      return { exists: false, title: '', author: '', inconclusive: false }
    }
    if (!response.ok) {
      return { exists: true, title: '', author: '', inconclusive: true }
    }
    const payload: unknown = await response.json()
    const record = typeof payload === 'object' && payload !== null ? payload : {}
    const title = Reflect.get(record, OembedField.Title)
    const author = Reflect.get(record, OembedField.AuthorName)
    return {
      exists: true,
      title: typeof title === 'string' ? title : '',
      author: typeof author === 'string' ? author : '',
      inconclusive: false,
    }
  } catch {
    return { exists: true, title: '', author: '', inconclusive: true }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Keep only tracks whose link resolves to a video that is plausibly the claimed
 * track. Anything gone, or live but clearly a different video, is reported back
 * so the caller can refuse the write rather than persist a bad link.
 */
export async function verifySoundtrackTracks(
  tracks: readonly ValidatedSoundtrackTrack[]
): Promise<VerifiedSoundtrackTracks> {
  const results = await Promise.all(
    tracks.map(async track => ({ track, check: await checkYoutubeVideo(track.youtubeUrl) }))
  )
  const live: ValidatedSoundtrackTrack[] = []
  const dead: string[] = []
  for (const { track, check } of results) {
    const label = `${track.title} — ${track.artist} (${track.youtubeUrl})`
    if (check.inconclusive) {
      live.push(track)
      continue
    }
    if (!check.exists) {
      dead.push(label)
      continue
    }
    const matches = metadataMatchesTrack(track.title, track.artist, check.title, check.author)
    if (matches) live.push(track)
    else dead.push(`${label} → actually "${check.title}" by ${check.author}`)
  }
  return { live, dead }
}
