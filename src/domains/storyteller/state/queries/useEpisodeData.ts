'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
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
import { resolveEpisodeIdForProject } from '@/domains/storyteller/state/utils/episode-param-for-project'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { recordFromJson, readString } from '@/shared/data/json-guards'

interface EpisodeBasic {
  id: string
  episode_prompt?: string
  title?: string | null
  masterPrompt?: string | null
  manuscriptMode: ManuscriptMode
}

function manuscriptModeFromEpisode(data: unknown): ManuscriptMode {
  const mode = readString(recordFromJson(data).manuscriptMode)
  if (mode === ManuscriptMode.Novel) return ManuscriptMode.Novel
  return ManuscriptMode.Script
}

function readStorytellerOverrideState(): string | null {
  if (typeof window === 'undefined') return null
  return browserStorage.getString(LocalStorageKeys.FORCE_STORYTELLER_STATE)
}

export function useEpisodeData(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const episodeParam = searchParams?.get(StorytellerQueryParam.EpisodeId) ?? null
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null)
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
  const resolvedEpisode = useMemo(
    () =>
      resolveEpisodeIdForProject({
        episodeParam,
        episodeIds: episodes.map(episode => episode.id),
        episodesReady: episodesQuery.isSuccess,
      }),
    [episodeParam, episodes, episodesQuery.isSuccess],
  )

  const currentEpisode = useMemo((): EpisodeBasic | null => {
    if (!currentEpisodeId || !episodeQuery.data) return null
    return {
      id: episodeQuery.data.id,
      episode_prompt: episodeQuery.data.episode_prompt ?? undefined,
      title: episodeQuery.data.title,
      masterPrompt: episodeQuery.data.masterPrompt,
      manuscriptMode: manuscriptModeFromEpisode(episodeQuery.data),
    }
  }, [currentEpisodeId, episodeQuery.data])

  const episodeTitleFromQuery = episodeQuery.data?.title ?? ''
  const resolvedEpisodeTitle = currentEpisodeTitle || episodeTitleFromQuery
  const headerEpisodeId = currentEpisodeId
  const headerEpisodeTitle = currentEpisodeId
    ? resolvedEpisodeTitle
    : (episodes[0]?.title ?? '')
  const episodeOrdinal = episodeDisplayOrdinal(episodes, headerEpisodeId)

  // Follow the verified URL only after this project's episode list has loaded.
  useEffect(() => {
    if (!episodesQuery.isSuccess) return
    queueMicrotask(() => setCurrentEpisodeId(resolvedEpisode.episodeId))
  }, [episodesQuery.isSuccess, resolvedEpisode.episodeId])

  useEffect(() => {
    if (!resolvedEpisode.dropParam || !pathname) return
    const params = storytellerSearchParams(searchParams)
    params.delete(StorytellerQueryParam.EpisodeId)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, resolvedEpisode.dropParam, router, searchParams])

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
