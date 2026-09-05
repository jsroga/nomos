'use client'

import { useEffect, useCallback, useRef } from 'react'
import { ActionHistoryStatus, ActionType } from '@/domains/storyteller/core/types/enums'
import { resolveEpisodeId } from '@/domains/storyteller/state/utils/episode-route'
import type { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import type { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  StorytellerGenerationAgentName,
  StorytellerGenerationFailLabel,
  StorytellerGenerationLog,
  StorytellerLogMessage,
  StorytellerPosterThemeFallback,
  StorytellerPosterType,
  StorytellerUnknownLabel,
} from '@/domains/storyteller/core/storyteller-page-wire'
import {
  MoodboardStorageKey,
  moodboardPrimaryStorageKey,
} from '@/domains/storyteller/services/constants/moodboard-generation-service'
import {
  PosterPersistField,
  PosterStorageKeyPrefix,
  PosterUserToast,
} from '@/domains/storyteller/services/constants/poster-generation-service'
import {
  fetchStorytellerEpisode,
  fetchStorytellerProjectOptional,
  patchStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import { BrowserStorageEventName } from '@/shared/chat/core/constants/chat-interface'
import { toastGenerationError } from '@/domains/storyteller/state/utils/toast-generation-error'
import {
  applyMoodboardImagesToPlan,
  resolvePrimaryMoodboardUrl,
  syncProjectMoodImages,
} from '@/domains/storyteller/state/utils/moodboard-plan-sync'
import { assignLatestPosterUrl, readEpisodePosterUrl } from '@/domains/storyteller/services/poster-url-from-episode'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

export function useStorytellerGeneration(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    currentEpisodeId,
    isGeneratingPoster,
    setIsGeneratingPoster,
    setPosterIsVariantGrid,
    isGeneratingStoryboard,
    setIsGeneratingStoryboard,
    storyPlan,
    setStoryPlan,
    setPrimaryMoodboardUrl,
    setActionHistory,
  } = core

  const lastResumedProjectId = useRef<string | null>(null)
  const lastHandledMoodboardCompleteVersion = useRef(0)
  const currentEpisodeIdRef = useRef(currentEpisodeId)

  useEffect(() => {
    currentEpisodeIdRef.current = currentEpisodeId
  }, [currentEpisodeId])

  // Resume pending poster generations on mount
  useEffect(() => {
    // Only run if we have a project ID and haven't resumed for this project yet
    if (currentProject?.id && lastResumedProjectId.current !== currentProject.id) {
      const projectId = currentProject.id
      lastResumedProjectId.current = projectId

      void (async () => {
        try {
          const { posterGenerationService } = await import(
            '@/domains/storyteller/services/poster-generation-service'
          )
          posterGenerationService.resumePendingGenerations(
            projectId,
            async (url, episodeId, type, meta) => {
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(false)
                setPosterIsVariantGrid(Boolean(meta?.isVariantGrid))
                if (episodeId === currentEpisodeIdRef.current) {
                  setStoryPlan(prev => assignLatestPosterUrl(prev, url))
                }
              } else if (episodeId === currentEpisodeIdRef.current) {
                setIsGeneratingStoryboard(false)
                setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))
              }

              try {
                if (type === StorytellerPosterType.Poster) {
                  await patchStorytellerEpisode(episodeId, {
                    [PosterPersistField.PosterUrl]: url,
                  })
                } else {
                  await patchStorytellerEpisode(episodeId, {
                    [PosterPersistField.StoryboardUrl]: url,
                  })
                }
              } catch (e) {
                console.error(StorytellerLogMessage.FailedSaveResumedGeneration, e)
              }
            },
            (error, episodeId, type) => {
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(false)
                setPosterIsVariantGrid(false)
              } else if (episodeId === currentEpisodeIdRef.current) {
                setIsGeneratingStoryboard(false)
              }
              toastGenerationError(
                type === StorytellerPosterType.Storyboard
                  ? PosterUserToast.StoryboardFailed
                  : PosterUserToast.PosterFailed,
                error,
              )
            },
            (episodeId, type) => {
              if (episodeId !== currentEpisodeIdRef.current) return
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(true)
                return
              }
              setIsGeneratingStoryboard(true)
            },
          )
        } catch {
        }
      })()
    }
  }, [
    currentProject?.id,
    setIsGeneratingPoster,
    setIsGeneratingStoryboard,
    setPosterIsVariantGrid,
    setStoryPlan,
  ])

  useEffect(() => {
    if (!currentEpisodeId) return
    const storyboardOpId = `${PosterStorageKeyPrefix.StoryboardGen}${currentEpisodeId}`
    if (browserStorage.has(storyboardOpId)) {
      setIsGeneratingStoryboard(true)
    }
  }, [currentEpisodeId, setIsGeneratingStoryboard])

  useEffect(() => {
    if (!currentEpisodeId) return
    let cancelled = false
    void (async () => {
      try {
        const episode = await fetchStorytellerEpisode(currentEpisodeId)
        if (cancelled) return
        const url = readEpisodePosterUrl(episode)
        if (!url) return
        setStoryPlan(prev => assignLatestPosterUrl(prev, url))
      } catch {
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentEpisodeId, setStoryPlan])

  const handleStoryboardTrigger = useCallback(
    async (
      eventOrEpisodeId?: Event | string | React.MouseEvent,
      model?: ApiframeVideoModel,
      look?: StoryboardVideoLook,
    ) => {
      let episodeId = resolveEpisodeId(eventOrEpisodeId, currentEpisodeId)

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingStoryboard) return

      setIsGeneratingStoryboard(true)

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `A visual storyboard for an episode titled "${readString(premise.title) ?? readString(storyPlan?.title) ?? StorytellerUnknownLabel.Unknown}".`

        const { posterGenerationService } = await import(
          '@/domains/storyteller/services/poster-generation-service'
        )
        await posterGenerationService.generateStoryboard(
          currentProject.id,
          episodeId,
          prompt,
          async url => {
            setIsGeneratingStoryboard(false)
            setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))
          },
          error => {
            setIsGeneratingStoryboard(false)
            toastGenerationError(PosterUserToast.StoryboardFailed, error)
          },
          model,
          look,
        )
      } catch (error) {
        console.error(StorytellerGenerationLog.StoryboardFailed, error)
        setIsGeneratingStoryboard(false)
        toastGenerationError(PosterUserToast.StoryboardFailed, error)
      }
    },
    [
      currentProject?.id,
      currentEpisodeId,
      isGeneratingStoryboard,
      storyPlan,
      setIsGeneratingStoryboard,
      setStoryPlan,
    ]
  )

  // Poster Trigger (Midjourney via Comet)
  const handlePosterTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId = resolveEpisodeId(eventOrEpisodeId, currentEpisodeId)

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingPoster) return

      setIsGeneratingPoster(true)
      setPosterIsVariantGrid(false)

      const apiKey =
        browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME) || undefined

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `Title: ${readString(premise.title) ?? readString(storyPlan?.title) ?? StorytellerUnknownLabel.Unknown}. Theme: ${readString(premise.thematicFocus) ?? StorytellerPosterThemeFallback.Cinematic}. ${readString(premise.protagonistHook) ?? ''}`

        // Log action start
        setActionHistory(prev => [
          {
            id: `poster-${Date.now()}`,
            action: { type: ActionType.GENERATE_POSTER, payload: { episodeId, prompt } },
            agentName: StorytellerGenerationAgentName.PosterAgent,
            status: ActionHistoryStatus.COMMITTED,
            timestamp: new Date(),
          },
          ...prev,
        ])

        const { posterGenerationService: posterSvc } = await import(
          '@/domains/storyteller/services/poster-generation-service'
        )
        await posterSvc.generatePoster(
          currentProject.id,
          episodeId,
          prompt,
          apiKey ? { apiKey } : {},
          async (url, meta) => {
            setIsGeneratingPoster(false)
            setPosterIsVariantGrid(Boolean(meta?.isVariantGrid))
            setStoryPlan(prev => assignLatestPosterUrl(prev, url))

            if (episodeId) {
              try {
                await patchStorytellerEpisode(episodeId, {
                  [PosterPersistField.PosterUrl]: url,
                })
              } catch (e) {
                console.error(StorytellerLogMessage.FailedSavePosterUrl, e)
              }
            }

            // Log completion
            setActionHistory(prev => [
              {
                id: `poster-complete-${Date.now()}`,
                action: { type: ActionType.GENERATE_POSTER, payload: { episodeId, prompt } },
                agentName: StorytellerGenerationAgentName.PosterAgent,
                status: ActionHistoryStatus.COMMITTED,
                timestamp: new Date(),
              },
              ...prev,
            ])
          },
          error => {
            setIsGeneratingPoster(false)
            setPosterIsVariantGrid(false)
            toastGenerationError(PosterUserToast.PosterFailed, error)
            setActionHistory(prev => [
              {
                id: `poster-fail-${Date.now()}`,
                action: {
                  type: ActionType.GENERATE_POSTER,
                  payload: { episodeId, prompt: StorytellerGenerationFailLabel.Failed },
                },
                agentName: StorytellerGenerationAgentName.PosterAgent,
                status: ActionHistoryStatus.UNDONE,
                timestamp: new Date(),
              },
              ...prev,
            ])
          },
        )
      } catch (error) {
        console.error(StorytellerGenerationLog.PosterFailed, error)
        setIsGeneratingPoster(false)
        setPosterIsVariantGrid(false)
        toastGenerationError(PosterUserToast.PosterFailed, error)

        // Log failure
        setActionHistory(prev => [
          {
            id: `poster-fail-${Date.now()}`,
            action: {
              type: ActionType.GENERATE_POSTER,
              payload: { episodeId, prompt: StorytellerGenerationFailLabel.Failed },
            },
            agentName: StorytellerGenerationAgentName.PosterAgent,
            status: ActionHistoryStatus.UNDONE,
            timestamp: new Date(),
          },
          ...prev,
        ])
      }
    },
    [
      currentProject?.id,
      currentEpisodeId,
      isGeneratingPoster,
      storyPlan,
      setActionHistory,
      setIsGeneratingPoster,
      setPosterIsVariantGrid,
      setStoryPlan,
    ]
  )

  // Moodboard Generation Trigger
  const handleMoodboardTrigger = useCallback(
    async (projectIdOverride?: string) => {
      const projectId = projectIdOverride || currentProject?.id

      if (!projectId) return

      const { moodboardGenerationService } = await import(
        '@/domains/storyteller/services/moodboard-generation-service'
      )
      await moodboardGenerationService.generate(projectId, [], {}, async () => {
        // Refetch project data when generation completes
        try {
          const data = await fetchStorytellerProjectOptional(projectId)
          if (data) {
            const bible = parseSeriesBibleRecord(data.seriesBible ?? data.series_bible)
            const moodImages = stringArrayFromJson(bible.moodImages)
            if (moodImages.length > 0) {
              setStoryPlan(prev =>
                prev ? { ...prev, moodImages } : prev
              )
              syncProjectMoodImages(moodImages)
            }
          }
        } catch (error) {
          console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
        }
      })
    },
    [currentProject?.id, setStoryPlan]
  )

  const projectId = currentProject?.id
  const moodImages = storyPlan?.moodImages

  const updatePrimaryMoodboard = useCallback(() => {
    if (!projectId) return
    const next = resolvePrimaryMoodboardUrl(
      projectId,
      moodImages,
      browserStorage.getString(moodboardPrimaryStorageKey(projectId)),
    )
    setPrimaryMoodboardUrl(prev => (prev === next ? prev : next))
  }, [projectId, moodImages, setPrimaryMoodboardUrl])

  // Listen for primary moodboard changes and generation completion
  useEffect(() => {
    updatePrimaryMoodboard()
  }, [updatePrimaryMoodboard])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith(MoodboardStorageKey.PrimaryPrefix)) {
        updatePrimaryMoodboard()
      }
    }
    window.addEventListener(BrowserStorageEventName.Storage, handleStorageChange)
    return () => window.removeEventListener(BrowserStorageEventName.Storage, handleStorageChange)
  }, [updatePrimaryMoodboard])

  const moodboardPrimaryVersion = useStorytellerUiStore(state => state.moodboardPrimaryVersion)
  const moodboardComplete = useStorytellerUiStore(state => state.moodboardComplete)
  const moodboardCompleteVersion = useStorytellerUiStore(state => state.moodboardCompleteVersion)

  useEffect(() => {
    if (moodboardPrimaryVersion === 0) return
    updatePrimaryMoodboard()
  }, [moodboardPrimaryVersion, updatePrimaryMoodboard])

  useEffect(() => {
    if (!moodboardComplete || moodboardCompleteVersion === 0) return
    if (lastHandledMoodboardCompleteVersion.current === moodboardCompleteVersion) return
    if (moodboardComplete.projectId !== currentProject?.id) return
    lastHandledMoodboardCompleteVersion.current = moodboardCompleteVersion

    const detail = moodboardComplete
    console.log(StorytellerLogMessage.MoodboardGenerationComplete, detail)

    void (async () => {
      const images = detail.images.filter((url): url is string => !!url)
      if (images.length > 0) {
        setStoryPlan(prev => applyMoodboardImagesToPlan(prev, images, detail.promptIndex))
      }

      try {
        const data = await fetchStorytellerProjectOptional(detail.projectId)
        if (data) {
          const bible = parseSeriesBibleRecord(data.seriesBible ?? data.series_bible)
          const nextImages = stringArrayFromJson(bible.moodImages)
          const generated = images[0]
          if (
            nextImages.length > 0 &&
            (!generated || nextImages.includes(generated))
          ) {
            setStoryPlan(prev => applyMoodboardImagesToPlan(prev, nextImages, detail.promptIndex))
            syncProjectMoodImages(nextImages)
          }
        }
      } catch (error) {
        console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
      }
    })()
  }, [moodboardComplete, moodboardCompleteVersion, currentProject?.id, setStoryPlan])

  return {
    handleStoryboardTrigger,
    handlePosterTrigger,
    handleMoodboardTrigger,
    updatePrimaryMoodboard,
  }
}
