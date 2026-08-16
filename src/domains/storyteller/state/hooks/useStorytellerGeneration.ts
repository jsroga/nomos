'use client'

import { useEffect, useCallback, useRef } from 'react'
import { ActionHistoryStatus, ActionType } from '@/domains/storyteller/core/types/enums'
import type { BeatCard as Beat } from '@/domains/storyteller/core/types/story-types'
import { resolveEpisodeId } from '@/domains/storyteller/state/utils/episode-route'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
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
  PosterUserToast,
} from '@/domains/storyteller/services/constants/poster-generation-service'
import {
  patchStorytellerEpisode,
  fetchStorytellerProjectOptional,
} from '@/domains/storyteller/core/io/storyteller.api'
import { BrowserStorageEventName } from '@/shared/chat/core/constants/chat-interface'
import { toastGenerationError } from '@/domains/storyteller/state/utils/toast-generation-error'
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
    beats,
    setPrimaryMoodboardUrl,
    setActionHistory,
  } = core

  const lastResumedProjectId = useRef<string | null>(null)

  // Resume pending poster generations on mount
  useEffect(() => {
    // Only run if we have a project ID and haven't resumed for this project yet
    if (currentProject?.id && lastResumedProjectId.current !== currentProject.id) {
      const projectId = currentProject.id
      lastResumedProjectId.current = projectId

      import('@/domains/storyteller/services/poster-generation-service').then(({ posterGenerationService }) =>
        posterGenerationService.resumePendingGenerations(
          projectId,
          async (url, episodeId, type, meta) => {
            if (episodeId === currentEpisodeId) {
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(false)
                setPosterIsVariantGrid(Boolean(meta?.isVariantGrid))
                setStoryPlan(prev => (prev ? { ...prev, posterUrl: url } : null))
              } else {
                setIsGeneratingStoryboard(false)
                setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))
              }
            }

            try {
              const payload =
                type === StorytellerPosterType.Poster
                  ? { [PosterPersistField.PosterUrl]: url }
                  : { [PosterPersistField.StoryboardUrl]: url }
              await patchStorytellerEpisode(episodeId, payload)
            } catch (e) {
              console.error(StorytellerLogMessage.FailedSaveResumedGeneration, e)
            }
          },
          (error, episodeId, type) => {
            if (episodeId === currentEpisodeId) {
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(false)
                setPosterIsVariantGrid(false)
              } else {
                setIsGeneratingStoryboard(false)
              }
            }
            toastGenerationError(
              type === StorytellerPosterType.Storyboard
                ? PosterUserToast.StoryboardFailed
                : PosterUserToast.PosterFailed,
              error,
            )
          },
        )
      )
    }
  }, [
    currentProject?.id,
    currentEpisodeId,
    setIsGeneratingPoster,
    setIsGeneratingStoryboard,
    setPosterIsVariantGrid,
    setStoryPlan,
  ])

  // Storyboard Trigger (Gemini)
  const handleStoryboardTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId = resolveEpisodeId(eventOrEpisodeId, currentEpisodeId)

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingStoryboard) return

      setIsGeneratingStoryboard(true)

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `A visual storyboard for an episode titled "${readString(premise.title) ?? readString(storyPlan?.title) ?? StorytellerUnknownLabel.Unknown}".`

        const beatsPayload = beats.map((b: Beat) => ({
          logline: b.logline,
          visualHook: b.content,
          imagePrompt: b.imagePrompt,
        }))

        const { posterGenerationService } = await import(
          '@/domains/storyteller/services/poster-generation-service'
        )
        const apiKey =
          browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME) || undefined
        await posterGenerationService.generateStoryboard(
          currentProject.id,
          episodeId,
          prompt,
          beatsPayload,
          apiKey ? { apiKey } : {},
          async url => {
            setIsGeneratingStoryboard(false)
            setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))

            if (episodeId) {
              try {
                await patchStorytellerEpisode(episodeId, {
                  [PosterPersistField.StoryboardUrl]: url,
                })
              } catch (e) {
                console.error(StorytellerLogMessage.FailedSaveStoryboardUrl, e)
              }
            }
          },
          error => {
            setIsGeneratingStoryboard(false)
            toastGenerationError(PosterUserToast.StoryboardFailed, error)
          },
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
      beats,
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
            setStoryPlan(prev => (prev ? { ...prev, posterUrl: url } : null))

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
      await moodboardGenerationService.generate(projectId, [], undefined, {}, async () => {
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
              // Also update the store - get fresh reference from store
              const latestProject = useWorkspaceProjectStore.getState().currentProject
              if (latestProject) {
                useWorkspaceProjectStore.getState().setCurrentProject({
                  ...latestProject,
                  series_bible: {
                    ...parseSeriesBibleRecord(latestProject.series_bible),
                    moodImages,
                  },
                })
              }
            }
          }
        } catch (error) {
          console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
        }
      })
    },
    [currentProject?.id, setStoryPlan]
  )

  // Update primary moodboard background
  const updatePrimaryMoodboard = useCallback(() => {
    if (!currentProject?.id) return
    const savedPrimary = browserStorage.getString(moodboardPrimaryStorageKey(currentProject.id))
    const primaryIdx = savedPrimary !== null ? parseInt(savedPrimary) : null
    if (primaryIdx !== null && storyPlan?.moodImages?.[primaryIdx]) {
      const img = storyPlan.moodImages[primaryIdx]
      // Handle both local filenames and absolute URLs
      if (img.startsWith(UrlScheme.Http)) {
        setPrimaryMoodboardUrl(img)
      } else {
        setPrimaryMoodboardUrl(`/projects/${currentProject.id}/${img}`)
      }
    } else {
      setPrimaryMoodboardUrl(null)
    }
  }, [currentProject, storyPlan?.moodImages, setPrimaryMoodboardUrl])

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
    const detail = moodboardComplete
    if (detail.projectId !== currentProject?.id) return

    console.log(StorytellerLogMessage.MoodboardGenerationComplete, detail)

    void (async () => {
      const images = detail.images.filter((url): url is string => !!url)
      if (images.length > 0) {
        setStoryPlan(prev => {
          if (!prev) return prev
          const currentImages = prev.moodImages ?? []
          const promptIndex = detail.promptIndex

          if (promptIndex !== undefined) {
            const updated = [...currentImages]
            updated[promptIndex] = images[0]
            return { ...prev, moodImages: updated }
          }

          return { ...prev, moodImages: [...currentImages, ...images] }
        })
      }

      try {
        const data = await fetchStorytellerProjectOptional(detail.projectId)
        if (data) {
          const bible = parseSeriesBibleRecord(data.seriesBible ?? data.series_bible)
          const moodImages = stringArrayFromJson(bible.moodImages)
          if (moodImages.length > 0) {
            setStoryPlan(prev =>
              prev ? { ...prev, moodImages } : prev
            )
          }
        }
      } catch (error) {
        console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
      }

      updatePrimaryMoodboard()
    })()
  }, [
    moodboardComplete,
    moodboardCompleteVersion,
    currentProject?.id,
    setStoryPlan,
    updatePrimaryMoodboard,
  ])

  return {
    handleStoryboardTrigger,
    handlePosterTrigger,
    handleMoodboardTrigger,
    updatePrimaryMoodboard,
  }
}
