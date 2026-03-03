'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cachedFetch, clearFetchCache } from '@/lib/fetch-cache'
import { LocalStorageKeys } from '@/constants/localStorage'

interface EpisodeBasic {
  id: string
  episode_prompt?: string
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem(LocalStorageKeys.FORCE_STORYTELLER_STATE)
      if (override) setOverrideState(override)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    if (!projectId) return

    if (overrideState === 'HAS_EPISODES') {
      setHasEpisodes(true)
      return
    } else if (overrideState === 'NO_EPISODES') {
      setHasEpisodes(false)
      return
    }

    cachedFetch(
      `episodes:${projectId}`,
      async () => {
        const res = await fetch(`/api/storyteller/episodes?projectId=${projectId}`)
        return res.json()
      },
      { ttlMs: 60_000 }
    )
      .then(data => {
        if (!isMounted) return
        if (overrideState === 'HAS_EPISODES') {
          setHasEpisodes(true)
        } else if (overrideState === 'NO_EPISODES') {
          setHasEpisodes(false)
        } else if (Array.isArray(data)) {
          const hasAny = data.length > 0
          setHasEpisodes(hasAny)
          setFirstEpisodeId(hasAny && data[0]?.id ? data[0].id : null)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [projectId, overrideState])

  useEffect(() => {
    if (!currentEpisodeId) {
      setCurrentEpisode(null)
      return
    }

    const fetchEpisode = async () => {
      try {
        const res = await fetch(`/api/storyteller/episodes/${currentEpisodeId}`)
        if (res.ok) {
          const data = await res.json()
          setCurrentEpisode(data)
          if (data.title) setCurrentEpisodeTitle(data.title)
        }
      } catch (err) {
        console.error('Failed to fetch episode:', err)
      }
    }

    fetchEpisode()
  }, [currentEpisodeId])

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
  }
}
