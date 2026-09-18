export function resolveEpisodeIdForProject(input: {
  episodeParam: string | null
  episodeIds: readonly string[]
  episodesReady: boolean
}): { episodeId: string | null; dropParam: boolean } {
  if (!input.episodeParam) return { episodeId: null, dropParam: false }
  if (!input.episodesReady) return { episodeId: null, dropParam: false }
  if (input.episodeIds.includes(input.episodeParam)) {
    return { episodeId: input.episodeParam, dropParam: false }
  }
  return { episodeId: null, dropParam: true }
}

export function shouldHydrateStorytellerProject(input: {
  routeProjectId: string | undefined
  currentProjectId: string | undefined
}): boolean {
  return Boolean(
    input.routeProjectId &&
      input.currentProjectId &&
      input.routeProjectId === input.currentProjectId,
  )
}
