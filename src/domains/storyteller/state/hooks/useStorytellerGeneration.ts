'use client'

import { useEffect, useCallback, useRef } from 'react'
import { ActionHistoryStatus, ActionType } from '@/domains/storyteller'
import type { BeatCard as Beat } from '@/domains/storyteller/core/types/StoryTypes'
import { resolveEpisodeId } from '@/domains/storyteller/state/utils/episode-route'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  StorytellerGenerationAgentName,
  StorytellerGenerationAlert,
  StorytellerGenerationFailLabel,
  StorytellerGenerationLog,
  StorytellerHttpMethod,
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
} from '@/domains/storyteller/services/constants/poster-generation-service'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { BrowserStorageEventName } from '@/shared/chat/ui/constants/chat-interface'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

export function useStorytellerGeneration(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    currentEpisodeId,
    isGeneratingPoster,
    setIsGeneratingPoster,
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
      lastResumedProjectId.current = currentProject.id

      import('@/domains/storyteller').then(({ posterGenerationService }) =>
        posterGenerationService.resumePendingGenerations(
          currentProject!.id,
          async (url, episodeId, type) => {
            if (episodeId === currentEpisodeId) {
              if (type === StorytellerPosterType.Poster) {
                setIsGeneratingPoster(false)
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
              await fetch(`/api/storyteller/episodes/${episodeId}`, {
                method: StorytellerHttpMethod.Patch,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            } catch (e) {
              console.error(StorytellerLogMessage.FailedSaveResumedGeneration, e)
            }
          }
        )
      )
    }
  }, [currentProject?.id, currentEpisodeId])

  // Storyboard Trigger (Gemini)
  const handleStoryboardTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId = resolveEpisodeId(eventOrEpisodeId, currentEpisodeId)

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingStoryboard) return

      setIsGeneratingStoryboard(true)

      // Read Gemini API key from localStorage (legacy client-side config)
      let geminiApiKey: string | undefined
      try {
        const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
        if (geminiConfig) geminiApiKey = JSON.parse(geminiConfig).apiKey
      } catch { /* ignore */ }

      if (!geminiApiKey) {
        alert(StorytellerGenerationAlert.GeminiApiKeyMissing)
        setIsGeneratingStoryboard(false)
        return
      }

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `A visual storyboard for an episode titled "${readString(premise.title) ?? readString(storyPlan?.title) ?? StorytellerUnknownLabel.Unknown}".`

        const beatsPayload = beats.map((b: Beat) => ({
          logline: b.logline,
          visualHook: b.content,
          imagePrompt: b.imagePrompt,
        }))

        const { posterGenerationService } = await import('@/domains/storyteller')
        await posterGenerationService.generateStoryboard(
          currentProject.id,
          episodeId,
          prompt,
          beatsPayload,
          { apiKey: geminiApiKey },
          async url => {
            setIsGeneratingStoryboard(false)
            setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))

            if (episodeId) {
              try {
                await fetch(`/api/storyteller/episodes/${episodeId}`, {
                  method: StorytellerHttpMethod.Patch,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [PosterPersistField.StoryboardUrl]: url }),
                })
              } catch (e) {
                console.error(StorytellerLogMessage.FailedSaveStoryboardUrl, e)
              }
            }
          }
        )
      } catch (error) {
        console.error(StorytellerGenerationLog.StoryboardFailed, error)
        setIsGeneratingStoryboard(false)
      }
    },
    [currentProject?.id, currentEpisodeId, isGeneratingStoryboard, beats, storyPlan]
  )

  // Poster Trigger (Midjourney via Comet)
  const handlePosterTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId = resolveEpisodeId(eventOrEpisodeId, currentEpisodeId)

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingPoster) return

      setIsGeneratingPoster(true)

      // Retrieve LegNext API key from local storage
      let apiKey = ''
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(LocalStorageKeys.AI_CONFIG_LEGNEXT)
          if (stored) {
            const parsed = JSON.parse(stored)
            apiKey = parsed.apiKey || ''
          }
        }
      } catch (e) {
        console.warn(StorytellerGenerationLog.LegNextConfigParseFailed, e)
      }

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

        const { posterGenerationService: posterSvc } = await import('@/domains/storyteller')
        await posterSvc.generatePoster(
          currentProject.id,
          episodeId,
          prompt,
          { apiKey },
          async url => {
            setIsGeneratingPoster(false)
            setStoryPlan(prev => (prev ? { ...prev, posterUrl: url } : null))

            if (episodeId) {
              try {
                await fetch(`/api/storyteller/episodes/${episodeId}`, {
                  method: StorytellerHttpMethod.Patch,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [PosterPersistField.PosterUrl]: url }),
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
          }
        )
      } catch (error) {
        console.error(StorytellerGenerationLog.PosterFailed, error)
        setIsGeneratingPoster(false)
        alert(StorytellerGenerationAlert.PosterGenerationFailed)

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
    [currentProject?.id, currentEpisodeId, isGeneratingPoster, storyPlan]
  )

  // Moodboard Generation Trigger
  const handleMoodboardTrigger = useCallback(
    async (projectIdOverride?: string) => {
      const projectId = projectIdOverride || currentProject?.id

      if (!projectId) return

      const { moodboardGenerationService } = await import('@/domains/storyteller')
      await moodboardGenerationService.generate(projectId, [], undefined, {}, async () => {
        // Refetch project data when generation completes
        try {
          const response = await fetch(`/api/storyteller/projects/${projectId}`)
          if (response.ok) {
            const data = await response.json()
            const bible = data.seriesBible || data.series_bible
            if (bible?.moodImages) {
              setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
              // Also update the store - get fresh reference from store
              const latestProject = useWorldStore.getState().currentProject
              if (latestProject) {
                useWorldStore.getState().setCurrentProject({
                  ...latestProject,
                  series_bible: {
                    ...(latestProject.series_bible ?? {}),
                    moodImages: bible.moodImages,
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
    [currentProject?.id]
  )

  // Update primary moodboard background
  const updatePrimaryMoodboard = useCallback(() => {
    if (!currentProject?.id) return
    const savedPrimary = localStorage.getItem(moodboardPrimaryStorageKey(currentProject.id))
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
        const response = await fetch(`/api/storyteller/projects/${detail.projectId}`)
        if (response.ok) {
          const data = await response.json()
          const bible = data.seriesBible || data.series_bible
          if (bible?.moodImages) {
            setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
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
