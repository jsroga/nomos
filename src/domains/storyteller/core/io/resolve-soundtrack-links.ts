/**
 * Turn a model's soundtrack proposal into links that actually play.
 *
 * A language model cannot know YouTube video ids — they are not facts it can
 * recall, so it invents well-formed ones and every link 404s (or, worse, lands
 * on a real but unrelated video). The title and artist, on the other hand, it
 * gets right. So the id is resolved by searching YouTube for that title/artist
 * rather than trusting anything the model wrote in `youtubeUrl`.
 *
 * `youtube-search-api` scrapes the public search page — no API key, no quota,
 * and no 100-searches-a-day cap. It is scraping, so every failure path falls
 * back to verifying whatever the model proposed instead of throwing.
 */

import '@/shared/data/server-guard'
import { GetListByKeyword } from 'youtube-search-api'
import type { ValidatedSoundtrackTrack } from '@/domains/storyteller/core/utils/youtube-utils'
import { checkYoutubeVideo, metadataMatchesTrack, trackMatchScore } from './verify-youtube-videos'

const WATCH_URL_PREFIX = 'https://www.youtube.com/watch?v='
const SEARCH_RESULT_LIMIT = 5
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

enum SearchOption {
  Video = 'video',
}

enum SearchItemField {
  Id = 'id',
  Type = 'type',
  Title = 'title',
  ChannelTitle = 'channelTitle',
}

/** Key holding the result array in the scraper's payload. */
const SEARCH_ITEMS_KEY = 'items'

export interface ResolvedSoundtrackTracks {
  resolved: ValidatedSoundtrackTrack[]
  /** Human-readable "title — artist" for tracks no real video could back. */
  unresolved: string[]
}

interface SearchCandidate {
  id: string
  title: string
  channel: string
}

function readString(source: object, key: string): string {
  const value = Reflect.get(source, key)
  return typeof value === 'string' ? value : ''
}

/** The scraper's payload is untyped; keep only entries shaped like a video hit. */
function candidatesFrom(payload: unknown): SearchCandidate[] {
  if (typeof payload !== 'object' || payload === null) return []
  const items = Reflect.get(payload, SEARCH_ITEMS_KEY)
  if (!Array.isArray(items)) return []
  const candidates: SearchCandidate[] = []
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    if (readString(item, SearchItemField.Type) !== SearchOption.Video) continue
    const id = readString(item, SearchItemField.Id)
    if (!YOUTUBE_ID_PATTERN.test(id)) continue
    candidates.push({
      id,
      title: readString(item, SearchItemField.Title),
      channel: readString(item, SearchItemField.ChannelTitle),
    })
  }
  return candidates
}

async function searchYoutube(query: string): Promise<SearchCandidate[]> {
  try {
    const payload: unknown = await GetListByKeyword(query, false, SEARCH_RESULT_LIMIT, [
      { type: SearchOption.Video },
    ])
    return candidatesFrom(payload)
  } catch {
    return []
  }
}

/**
 * Best hit that actually names the song, preferring one that also names the
 * artist. There is deliberately no "just take the top result" fallback: the top
 * hit for a song YouTube does not have is some other song, and a confidently
 * wrong link is worse than a missing one.
 */
export function pickBestCandidate(
  track: ValidatedSoundtrackTrack,
  candidates: readonly SearchCandidate[]
): SearchCandidate | null {
  let best: SearchCandidate | null = null
  let bestScore = 0
  for (const candidate of candidates) {
    const score = trackMatchScore(track.title, track.artist, candidate.title, candidate.channel)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

/** Keep the model's own link only when it exists AND is plausibly this track. */
async function keepProposedLink(track: ValidatedSoundtrackTrack): Promise<boolean> {
  const check = await checkYoutubeVideo(track.youtubeUrl)
  if (check.inconclusive) return true
  if (!check.exists) return false
  return metadataMatchesTrack(track.title, track.artist, check.title, check.author)
}

/**
 * Punctuation derails YouTube search: "Nick Cave & The Bad Seeds O Children"
 * returns Into My Arms and four other songs, while the same query without the
 * ampersand puts O Children first. Letters and numbers only — `\p{L}` keeps
 * accented names like Sigur Rós intact.
 */
export function searchQueryFor(artist: string, title: string): string {
  return `${artist} ${title}`.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

async function resolveOne(
  track: ValidatedSoundtrackTrack
): Promise<ValidatedSoundtrackTrack | null> {
  const queries = [
    searchQueryFor(track.artist, track.title),
    // Retry on title alone: a mis-attributed or overly long artist string
    // otherwise buries the song it belongs to.
    searchQueryFor('', track.title),
  ]
  for (const query of queries) {
    if (!query) continue
    const best = pickBestCandidate(track, await searchYoutube(query))
    if (best) return { ...track, youtubeUrl: `${WATCH_URL_PREFIX}${best.id}` }
  }
  return (await keepProposedLink(track)) ? track : null
}

export async function resolveSoundtrackTracks(
  tracks: readonly ValidatedSoundtrackTrack[]
): Promise<ResolvedSoundtrackTracks> {
  const results = await Promise.all(
    tracks.map(async track => ({ track, next: await resolveOne(track) }))
  )
  const resolved: ValidatedSoundtrackTrack[] = []
  const unresolved: string[] = []
  for (const { track, next } of results) {
    if (next) resolved.push(next)
    else unresolved.push(`${track.title} — ${track.artist}`)
  }
  return { resolved, unresolved }
}
