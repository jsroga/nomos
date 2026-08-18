'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { useEpisode, useEpisodes } from '@/domains/storyteller/state/queries/useEpisodes'
import {
  StorytellerOverrideState,
  StorytellerQueryParam,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'
import {
  episodeDisplayOrdinal,
  sortEpisodesForDisplay,
} from '@/domains/storyteller/state/utils/episode-list'

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

  const episodes = useMemo(() => {
    if (!Array.isArray(episodesQuery.data)) return []
    return sortEpisodesForDisplay(episodesQuery.data.filter(episode => episode.id.length > 0))
  }, [episodesQuery.data])

  const hasEpisodes = useMemo(() => {
    if (!projectId) return false
    if (overrideState === StorytellerOverrideState.HasEpisodes) return true
    if (overrideState === StorytellerOverrideState.NoEpisodes) return false
    return episodes.length > 0
  }, [projectId, overrideState, episodes.length])

  const firstEpisodeId = useMemo(() => episodes[0]?.id ?? null, [episodes])

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
  const headerEpisodeId = currentEpisodeId ?? firstEpisodeId
  const headerEpisodeTitle = currentEpisodeId
    ? resolvedEpisodeTitle
    : (episodes[0]?.title ?? '')
  const episodeOrdinal = episodeDisplayOrdinal(episodes, headerEpisodeId)

  // Follow the URL only. Do not depend on local id — selectEpisode sets state
  // before router.push, and treating that gap as "URL won" cleared the selection.
  useEffect(() => {
    queueMicrotask(() => setCurrentEpisodeId(episodeParam))
  }, [episodeParam])

  const selectEpisode = useCallback(
    (id: string) => {
      setCurrentEpisodeId(id)
      const params = storytellerSearchParams(searchParams)
      params.set(StorytellerQueryParam.EpisodeId, id)
      router.push(`?${params.toString()}`)
    },
    [searchParams, router]
  )

  return {
    currentEpisodeId,
    setCurrentEpisodeId,
    currentEpisodeTitle: resolvedEpisodeTitle,
    headerEpisodeTitle,
    episodeOrdinal,
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
