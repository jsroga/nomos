'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStorytellerBibleLock } from '../../io/storyteller.api'
import { storytellerKeys } from '../../io/storyteller.keys'

export function useBibleLock(projectId: string | undefined) {
  return useQuery({
    queryKey: storytellerKeys.bibleLock(projectId ?? ''),
    queryFn: () => fetchStorytellerBibleLock(projectId!),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  })
}
