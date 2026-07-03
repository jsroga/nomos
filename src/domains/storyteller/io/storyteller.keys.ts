export const storytellerKeys = {
  all: ['storyteller'] as const,
  episodes: (projectId: string) => [...storytellerKeys.all, 'episodes', projectId] as const,
  episode: (episodeId: string) => [...storytellerKeys.all, 'episode', episodeId] as const,
  bibleLock: (projectId: string) => [...storytellerKeys.all, 'bible-lock', projectId] as const,
  entity: (projectId: string | null | undefined, id: string, context?: string) =>
    [...storytellerKeys.all, 'entity', projectId ?? null, id, context ?? null] as const,
}
