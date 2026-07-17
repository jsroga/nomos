import {
  EPISODE_PREMISE_PROJECTS_PATH_PREFIX,
  EpisodePremiseUrlScheme,
} from '../constants/episode-premise-panel'

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
  if (localPoster) {
    return resolvePosterSegment(localPoster, projectId)
  }
  if (!posterUrl) {
    return null
  }
  return resolvePosterSegment(posterUrl, projectId)
}
