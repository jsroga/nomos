'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { browserStorage } from '@/shared/data/browser-storage'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { triggerRunRefetchInterval } from '@/shared/data/polling/trigger-run-query'
import {
  fetchCharacterPortraitRunStatus,
  startCharacterPortraitGeneration,
} from '../../core/io/character.api'
import { isFailedTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'

export interface PortraitGenerationResult {
  imageUrl: string
}

interface UseCharacterPortraitGenerationOptions {
  projectId: string | undefined
  charId: string
  onComplete: (result: PortraitGenerationResult) => void
  onFailed: (error: unknown) => void
  onPollCancelled: () => void
}

export function useCharacterPortraitGeneration({
  projectId,
  charId,
  onComplete,
  onFailed,
  onPollCancelled,
}: UseCharacterPortraitGenerationOptions) {
  const queryClient = useQueryClient()
  const generationIdsRef = useRef<Record<string, number>>({})
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activeGenerationId, setActiveGenerationId] = useState(0)

  const startMutation = useMutation({
    mutationFn: async (input: { prompt: string; name: string; gender: string }) => {
      if (!projectId) throw new Error('projectId required')

      const apiKey = browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_LEGNEXT)

      return startCharacterPortraitGeneration({
        prompt: input.prompt || `A portrait of ${input.name}, ${input.gender}`,
        projectId,
        apiKey,
      })
    },
    onSuccess: data => {
      if (data.handleId) {
        setActiveRunId(data.handleId)
        return
      }
      onFailed(null)
    },
    onError: error => {
      onFailed(error)
    },
  })

  const statusQuery = useQuery({
    queryKey: ['character-portrait-run', charId, activeRunId],
    queryFn: () => fetchCharacterPortraitRunStatus(activeRunId ?? ''),
    enabled: Boolean(activeRunId),
    refetchInterval: query => triggerRunRefetchInterval(query),
  })

  useEffect(() => {
    if (!activeRunId || !statusQuery.data) return

    const currentGenId = generationIdsRef.current[charId] ?? 0
    if (currentGenId !== activeGenerationId) {
      onPollCancelled()
      setActiveRunId(null)
      return
    }

    const { status, imageUrl, error } = statusQuery.data

    if (status && isSuccessTaskStatus(status)) {
      setActiveRunId(null)
      queryClient.removeQueries({ queryKey: ['character-portrait-run', charId, activeRunId] })
      if (imageUrl) {
        onComplete({ imageUrl })
      }
      return
    }

    if ((status && isFailedTaskStatus(status)) || error != null) {
      setActiveRunId(null)
      onFailed(error)
    }
  }, [
    activeGenerationId,
    activeRunId,
    charId,
    onComplete,
    onFailed,
    onPollCancelled,
    queryClient,
    statusQuery.data,
  ])

  const generatePortrait = useCallback(
    (input: { prompt: string; name: string; gender: string }) => {
      const nextId = (generationIdsRef.current[charId] ?? 0) + 1
      generationIdsRef.current[charId] = nextId
      setActiveGenerationId(nextId)
      setActiveRunId(null)
      startMutation.mutate(input)
    },
    [charId, startMutation]
  )

  const isGenerating = startMutation.isPending || Boolean(activeRunId)

  return {
    generatePortrait,
    isGenerating,
    startError: startMutation.error,
  }
}
