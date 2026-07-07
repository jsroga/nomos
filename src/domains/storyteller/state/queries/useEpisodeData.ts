'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { useEpisode, useEpisodes } from '@/domains/storyteller/state/queries/useEpisodes'

interface EpisodeBasic {
  id: string
  episode_prompt?: string
  title?: string | null
  masterPrompt?: string | null
}

export function useEpisodeData(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const episodeParam = searchParams?.get('episodeId') ?? null
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(episodeParam)
  const [currentEpisodeTitle, setCurrentEpisodeTitle] = useState<string>('')
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeBasic | null>(null)

  const [hasEpisodes, setHasEpisodes] = useState(false)
  const [firstEpisodeId, setFirstEpisodeId] = useState<string | null>(null)
  const [overrideState, setOverrideState] = useState<string | null>(null)
  const episodesQuery = useEpisodes(projectId)
  const episodeQuery = useEpisode(currentEpisodeId)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem(LocalStorageKeys.FORCE_STORYTELLER_STATE)
      if (override) setOverrideState(override)
    }
  }, [])

  useEffect(() => {
    if (!projectId) return

    if (overrideState === 'HAS_EPISODES') {
      setHasEpisodes(true)
      return
    } else if (overrideState === 'NO_EPISODES') {
      setHasEpisodes(false)
      return
    }

    if (Array.isArray(episodesQuery.data)) {
      const hasAny = episodesQuery.data.length > 0
      setHasEpisodes(hasAny)
      setFirstEpisodeId(hasAny && episodesQuery.data[0]?.id ? episodesQuery.data[0].id : null)
    }
  }, [projectId, overrideState, episodesQuery.data])

  useEffect(() => {
    if (!currentEpisodeId) {
      setCurrentEpisode(null)
      return
    }

    if (episodeQuery.data) {
      // Extract only the fields we need from the episode query data
      const episodeBasic: EpisodeBasic = {
        id: episodeQuery.data.id,
        episode_prompt: episodeQuery.data.episode_prompt ?? undefined,
        title: episodeQuery.data.title,
        masterPrompt: episodeQuery.data.masterPrompt,
      }
      setCurrentEpisode(episodeBasic)
      if (episodeQuery.data.title) {
        setCurrentEpisodeTitle(episodeQuery.data.title)
      }
    }
  }, [currentEpisodeId, episodeQuery.data])

  // Sync Episode ID from URL if it changes
  useEffect(() => {
    if (episodeParam !== currentEpisodeId) {
      setCurrentEpisodeId(episodeParam)
    }
  }, [episodeParam])

  const selectEpisode = useCallback(
    (id: string) => {
      setCurrentEpisodeId(id)
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.set('episodeId', id)
      router.push(`?${params.toString()}`)
    },
    [searchParams, router]
  )

  return {
    currentEpisodeId,
    setCurrentEpisodeId,
    currentEpisodeTitle,
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
