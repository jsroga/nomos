'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { useEpisode, useEpisodes } from '@/domains/storyteller/state/queries/useEpisodes'
import {
  StorytellerOverrideState,
  StorytellerQueryParam,
  StorytellerBibleQuery,
} from '@/domains/storyteller/core/storyteller-page-wire'

interface EpisodeBasic {
  id: string
  episode_prompt?: string
  title?: string | null
  masterPrompt?: string | null
}

function readStorytellerOverrideState(): string | null {
  if (typeof window === 'undefined') return null
  return browserStorage.getString(LocalStorageKeys.FORCE_STORYTELLER_STATE)
}

export function useEpisodeData(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const episodeParam = searchParams?.get(StorytellerQueryParam.EpisodeId) ?? null
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(episodeParam)
  const [currentEpisodeTitle, setCurrentEpisodeTitle] = useState<string>('')
  const [overrideState] = useState(readStorytellerOverrideState)
  const episodesQuery = useEpisodes(projectId)
  const episodeQuery = useEpisode(currentEpisodeId)

  const hasEpisodes = useMemo(() => {
    if (!projectId) return false
    if (overrideState === StorytellerOverrideState.HasEpisodes) return true
    if (overrideState === StorytellerOverrideState.NoEpisodes) return false
    if (Array.isArray(episodesQuery.data)) return episodesQuery.data.length > 0
    return false
  }, [projectId, overrideState, episodesQuery.data])

  const firstEpisodeId = useMemo(() => {
    if (!hasEpisodes || !Array.isArray(episodesQuery.data)) return null
    return episodesQuery.data[0]?.id ?? null
  }, [hasEpisodes, episodesQuery.data])

  const currentEpisode = useMemo((): EpisodeBasic | null => {
    if (!currentEpisodeId || !episodeQuery.data) return null
    return {
      id: episodeQuery.data.id,
      episode_prompt: episodeQuery.data.episode_prompt ?? undefined,
      title: episodeQuery.data.title,
      masterPrompt: episodeQuery.data.masterPrompt,
    }
  }, [currentEpisodeId, episodeQuery.data])

  const episodeTitleFromQuery = episodeQuery.data?.title ?? ''
  const resolvedEpisodeTitle = currentEpisodeTitle || episodeTitleFromQuery

  // Sync Episode ID from URL if it changes
  useEffect(() => {
    if (episodeParam === currentEpisodeId) return
    queueMicrotask(() => setCurrentEpisodeId(episodeParam))
  }, [episodeParam, currentEpisodeId])

  const selectEpisode = useCallback(
    (id: string) => {
      setCurrentEpisodeId(id)
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.set(StorytellerQueryParam.EpisodeId, id)
      // Rule: opening an episode always leaves the bible
      params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Off)
      router.push(`?${params.toString()}`)
    },
    [searchParams, router]
  )

  return {
    currentEpisodeId,
    setCurrentEpisodeId,
    currentEpisodeTitle: resolvedEpisodeTitle,
    setCurrentEpisodeTitle,
    currentEpisode,
    hasEpisodes,
    firstEpisodeId,
    overrideState,
    selectEpisode,
    episodesQuery,
    episodeQuery,
  }
}
