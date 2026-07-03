'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStorytellerEpisode, fetchStorytellerEpisodes } from '../../io/storyteller.api'
import { storytellerKeys } from '../../io/storyteller.keys'

export function useEpisodes(projectId: string | undefined) {
  return useQuery({
    queryKey: storytellerKeys.episodes(projectId ?? ''),
    queryFn: () => fetchStorytellerEpisodes(projectId!),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  })
}

export function useEpisode(episodeId: string | null | undefined) {
  return useQuery({
    queryKey: storytellerKeys.episode(episodeId ?? ''),
    queryFn: () => fetchStorytellerEpisode(episodeId!),
    enabled: Boolean(episodeId),
    staleTime: 60_000,
  })
}
