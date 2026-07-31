'use client'

import { useState, useEffect, useCallback } from 'react'
import { cachedFetch, clearFetchCache } from '@/shared/data/fetch-cache'
import {
  recordArrayFromJson,
  recordFromJson,
  readString,
  readNumber,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import {
  StorytellerLogMessage,
  StorytellerDefaultTitle,
  StorytellerBeatStatus,
  StorytellerBeatTypeDefault,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { projectHasStoredPlan } from '@/domains/storyteller/state/utils/episode-route'
import {
  buildFallbackBiblePlan,
  buildManualHydratedPlan,
  buildMergedEpisodePlan,
  inferEpisodePhase,
  shouldPreserveHydratedPlan,
} from '@/domains/storyteller/state/utils/merge-episode-plan'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import {
  createStorytellerCharacter,
  deleteStorytellerCharacter,
  fetchStorytellerCharacters,
  updateStorytellerCharacter,
} from '@/domains/storyteller/core/io/character.api'
import {
  fetchStorytellerPlan,
  fetchStorytellerProjectOptional,
  fetchStorytellerTimeline,
  patchStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

function beatStatusFromWire(value: string | undefined): NonNullable<BeatCard['status']> {
  if (value === StorytellerBeatStatus.Approved) return StorytellerBeatStatus.Approved
  if (value === StorytellerBeatStatus.Rejected) return StorytellerBeatStatus.Rejected
  return StorytellerBeatStatus.Proposed
}

export function useStorytellerEpisodeData(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    currentEpisodeId,
    setCharacters,
    setBeats,
    setSelectedBeatId,
    setStoryPlan,
    setIsPlanApproved,
    setCurrentPhase,
    setViewPhase,
    setScript,
    setIsFetchingPlan,
    setCurrentEpisodeTitle,
    storyPlan,
  } = core

  const [isFetchingCharacters, setIsFetchingCharacters] = useState(false)
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false)
  const [characterWebVersion, setCharacterWebVersion] = useState(0)

  // Fetch characters - using cachedFetch to prevent infinite loops on remount
  useEffect(() => {
    let isMounted = true
    const projectId = currentProject?.id
    if (!projectId) return

    setIsFetchingCharacters(true)

    cachedFetch(
      `characters:${projectId}`,
      () => fetchStorytellerCharacters(projectId),
      {
        ttlMs: 60_000,
        validate: (value): value is unknown[] => Array.isArray(value),
      }
    )
      .then(data => {
        if (!isMounted) return
        if (Array.isArray(data)) {
          const mapped = data
            .map(row => storytellerCharacterFromRow(row))
            .filter((character): character is NonNullable<typeof character> => character !== null)
          setCharacters(mapped)
        }
      })
      .catch(err => console.error(StorytellerLogMessage.FailedFetchCharacters, err))
      .finally(() => {
        if (isMounted) setIsFetchingCharacters(false)
      })

    return () => {
      isMounted = false
    }
  }, [currentProject?.id])

  // Resume any pending moodboard generations on mount
  useEffect(() => {
    const projectId = currentProject?.id
    if (projectId) {
      import('@/domains/storyteller/services/moodboard-generation-service').then(
        ({ moodboardGenerationService }) =>
        moodboardGenerationService.resumePendingGenerations(projectId, async () => {
          try {
            const data = await fetchStorytellerProjectOptional(projectId)
            if (data) {
              const bible = parseSeriesBibleRecord(data.seriesBible ?? data.series_bible)
              if (Array.isArray(bible.moodImages)) {
                setStoryPlan(prev =>
                  prev ? { ...prev, moodImages: stringArrayFromJson(bible.moodImages) } : prev
                )
              }
            }
          } catch (error) {
            console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
          }
        })
      )
    }
  }, [currentProject?.id])

  // Fetch beats for selected episode — clear stale beats immediately on switch
  useEffect(() => {
    if (!currentEpisodeId) {
      setBeats([])
      setSelectedBeatId(null)
      return
    }

    setBeats([])
    setSelectedBeatId(null)

    fetchStorytellerTimeline(currentEpisodeId)
      .then(data => {
        const beats = recordArrayFromJson(data.beats)
        if (beats.length > 0) {
          setBeats(
            beats.map(beat => {
              const row = recordFromJson(beat)
              return {
                id: readString(row.id) ?? '',
                sequence: readNumber(row.sequence) ?? 0,
                logline:
                  readString(row.logline) ??
                  readString(row.log_line) ??
                  StorytellerDefaultTitle.UntitledBeat,
                beatType:
                  readString(row.beat_type) ??
                  readString(row.beatType) ??
                  StorytellerBeatTypeDefault.Default,
                status: beatStatusFromWire(readString(row.status)),
              }
            }),
          )
        }
      })
      .catch(err => console.error(StorytellerLogMessage.FailedFetchBeats, err))
  }, [currentEpisodeId])

  // Fetch story plan for selected episode OR load project bible
  useEffect(() => {
    const { hasSeriesBible, hasStoryPlan } = projectHasStoredPlan(currentProject)

    if (!currentEpisodeId && !hasSeriesBible && !hasStoryPlan) {
      setStoryPlan(prev => (shouldPreserveHydratedPlan(prev) ? prev : null))
      return
    }

    if (currentEpisodeId) {
      setIsFetchingPlan(true)
      fetchStorytellerPlan(currentEpisodeId)
        .then(data => {
          const planRecord = recordFromJson(data)
          const mergedPlan = buildMergedEpisodePlan(planRecord, currentProject)
          const inferred = inferEpisodePhase(planRecord)

          if (mergedPlan) {
            setStoryPlan(mergedPlan)
            setIsPlanApproved(!!planRecord.planApproved)
            setCurrentPhase(inferred)
            setViewPhase(inferred)
            const script = planRecord.script
            if (typeof script === 'string') {
              setScript(script)
            }
            return
          }

          const fallbackPlan = buildFallbackBiblePlan(currentProject)
          if (fallbackPlan) {
            setStoryPlan(fallbackPlan)
          } else {
            setStoryPlan(null)
          }
          setIsPlanApproved(false)
          setCurrentPhase(inferred)
          setViewPhase(inferred)
        })
        .catch(err => console.error(StorytellerLogMessage.FailedFetchPlan, err))
        .finally(() => setIsFetchingPlan(false))
      return
    }

    if ((hasSeriesBible || hasStoryPlan) && !storyPlan) {
      const hydrated = buildManualHydratedPlan(currentProject)
      if (hydrated) {
        setStoryPlan(hydrated)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentEpisodeId,
    currentProject?.id,
    !!currentProject?.series_bible,
    !!currentProject?.story_plan,
  ])
  const handleCreateCharacter = async (char: Record<string, unknown>) => {
    if (!currentProject?.id) return
    try {
      const newChar = await createStorytellerCharacter({ ...char, projectId: currentProject.id })
      const newCharId = readString(newChar.id)
      if (newCharId) {
        clearFetchCache(`characters:${currentProject.id}`)
        const normalized = storytellerCharacterFromRow(newChar)
        if (normalized) {
          setCharacters(prev => [normalized, ...prev])
        }
      }
    } catch (error) {
      console.error(StorytellerLogMessage.FailedCreateCharacter, error)
    }
  }

  const handleUpdateCharacter = async (id: string, updates: Record<string, unknown>) => {
    try {
      const updated = await updateStorytellerCharacter({ id, ...updates })
      const updatedId = readString(updated.id)
      if (updatedId) {
        const normalized = storytellerCharacterFromRow(updated)
        setCharacters(prev =>
          prev.map(c => (c.id === id && normalized ? normalized : c)),
        )
      }
    } catch (error) {
      console.error(StorytellerLogMessage.FailedUpdateCharacter, error)
    }
  }

  const handleDeleteCharacter = async (id: string) => {
    try {
      setIsDeletingCharacter(true)
      const ok = await deleteStorytellerCharacter(id)
      if (ok) {
        if (currentProject?.id) clearFetchCache(`characters:${currentProject.id}`)
        setCharacters(prev => prev.filter(c => c.id !== id))
        setCharacterWebVersion(prev => prev + 1)
      }
    } catch (error) {
      console.error(StorytellerLogMessage.FailedDeleteCharacter, error)
    } finally {
      setIsDeletingCharacter(false)
    }
  }

  const updateEpisodePremise = useCallback(
    async (detail: Record<string, unknown>) => {
      if (Object.keys(detail).length === 0) return

      setStoryPlan(prev =>
        applyUpdatesToStoryPlan(prev, {
          premise: detail,
          title: readString(detail.title),
        })
      )

      const title = readString(detail.title)
      if (title) {
        setCurrentEpisodeTitle(title)
      }

      if (currentEpisodeId) {
        try {
          await patchStorytellerEpisode(currentEpisodeId, {
            premise: detail,
            title: detail.title,
          })
        } catch (err) {
          console.error(StorytellerLogMessage.FailedPersistPremise, err)
        }
      }
    },
    [currentEpisodeId, setCurrentEpisodeTitle, setStoryPlan]
  )

  return {
    isFetchingCharacters,
    isDeletingCharacter,
    characterWebVersion,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
    updateEpisodePremise,
  }
}
