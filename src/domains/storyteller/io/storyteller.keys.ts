import { StorytellerQueryKey } from '@/domains/storyteller/io/constants/query-keys'

export const storytellerKeys = {
  all: [StorytellerQueryKey.Root] as const,
  episodes: (projectId: string) => [...storytellerKeys.all, StorytellerQueryKey.Episodes, projectId] as const,
  episode: (episodeId: string) => [...storytellerKeys.all, StorytellerQueryKey.Episode, episodeId] as const,
  bibleLock: (projectId: string) => [...storytellerKeys.all, StorytellerQueryKey.BibleLock, projectId] as const,
  entity: (projectId: string | null | undefined, id: string, context?: string) =>
    [...storytellerKeys.all, StorytellerQueryKey.Entity, projectId ?? null, id, context ?? null] as const,
}
