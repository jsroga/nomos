import {
  EPISODE_PREMISE_PROJECTS_PATH_PREFIX,
  EpisodePremiseUrlScheme,
} from '../constants/episode-premise-panel'
import { preferLatestPosterUrl } from '@/domains/storyteller/services/poster-url-from-episode'

function resolvePosterSegment(url: string, projectId: string): string {
  if (
    url.startsWith(EpisodePremiseUrlScheme.Http) ||
    url.startsWith('/') ||
    url.startsWith(EpisodePremiseUrlScheme.Data)
  ) {
    return url
  }
  if (url.startsWith(EPISODE_PREMISE_PROJECTS_PATH_PREFIX)) {
    return `/${url}`
  }
  return `/projects/${projectId}/${url}`
}

export function resolveFullPosterUrl(
  localPoster: string | undefined,
  posterUrl: string | null | undefined,
  projectId: string
): string | null {
  const preferred = preferLatestPosterUrl(posterUrl, localPoster)
  if (!preferred) {
    return null
  }
  return resolvePosterSegment(preferred, projectId)
}
