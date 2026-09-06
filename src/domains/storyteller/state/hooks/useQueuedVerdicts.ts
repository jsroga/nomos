'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { buildUrl } from '@/shared/data/url-builder'
import { QueryFlag, QueryParam } from '@/shared/data/constants/protocol'
import { DEFAULT_RESUME_URL } from '@/shared/chat'
import { z } from 'zod'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'

const QueuedListSchema = z.object({
  queued: z.array(z.object({ runId: z.string().min(1) })),
})

async function fetchQueuedVerdictRunIds(projectId: string): Promise<string[]> {
  try {
    const response = await fetch(
      buildUrl(DEFAULT_RESUME_URL, {
        [QueryParam.ProjectId]: projectId,
        [QueryParam.Queued]: QueryFlag.On,
      })
    )
    if (!response.ok) return []
    const parsed = QueuedListSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.queued.map(row => row.runId) : []
  } catch {
    return []
  }
}

export function useQueuedVerdicts(projectId: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: storytellerKeys.queuedVerdicts(projectId),
    queryFn: () => fetchQueuedVerdictRunIds(projectId),
    enabled: Boolean(projectId),
  })

  const refresh = useCallback(async () => {
    if (!projectId) return
    await queryClient.invalidateQueries({ queryKey: storytellerKeys.queuedVerdicts(projectId) })
  }, [projectId, queryClient])

  return { runIds: query.data ?? [], refresh }
}
