'use client'

import { useEffect, useCallback, useRef } from 'react'
import { ActionHistoryStatus } from '@/domains/storyteller'
import type { BeatCard as Beat } from '@/domains/storyteller/core/types/StoryTypes'
import { resolveEpisodeId } from '@/domains/storyteller/state/utils/episode-route'
import { customEventDetailRecord, readNumber, readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { useWorldStore } from '@/domains/world-building-toolkit'
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
              if (type === 'poster') {
                setIsGeneratingPoster(false)
                setStoryPlan(prev => (prev ? { ...prev, posterUrl: url } : null))
              } else {
                setIsGeneratingStoryboard(false)
                setStoryPlan(prev => (prev ? { ...prev, storyboardUrl: url } : null))
              }
            }

            try {
              const payload = type === 'poster' ? { posterUrl: url } : { storyboardUrl: url }
              await fetch(`/api/storyteller/episodes/${episodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            } catch (e) {
              console.error('Failed to save resumed generation:', e)
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
        alert('Gemini API Key missing! Configure it in your environment.')
        setIsGeneratingStoryboard(false)
        return
      }

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `A visual storyboard for an episode titled "${readString(premise.title) ?? readString(storyPlan?.title) ?? 'Unknown'}".`

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
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ storyboardUrl: url }),
                })
              } catch (e) {
                console.error('Failed to save storyboard URL:', e)
              }
            }
          }
        )
      } catch (error) {
        console.error('Storyboard generation failed', error)
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
          const stored = localStorage.getItem('ai-config-legnext')
          if (stored) {
            const parsed = JSON.parse(stored)
            apiKey = parsed.apiKey || ''
          }
        }
      } catch (e) {
        console.warn('Failed to parse LegNext config', e)
      }

      try {
        const premise = recordFromJson(recordFromJson(storyPlan).premise)
        const prompt = `Title: ${readString(premise.title) ?? readString(storyPlan?.title) ?? 'Unknown'}. Theme: ${readString(premise.thematicFocus) ?? 'Cinematic'}. ${readString(premise.protagonistHook) ?? ''}`

        // Log action start
        setActionHistory(prev => [
          {
            id: `poster-${Date.now()}`,
            action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
            agentName: 'PosterAgent',
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
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ posterUrl: url }),
                })
              } catch (e) {
                console.error('Failed to save poster URL:', e)
              }
            }

            // Log completion
            setActionHistory(prev => [
              {
                id: `poster-complete-${Date.now()}`,
                action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
                agentName: 'PosterAgent',
                status: ActionHistoryStatus.COMMITTED,
                timestamp: new Date(),
              },
              ...prev,
            ])
          }
        )
      } catch (error) {
        console.error('Poster generation failed', error)
        setIsGeneratingPoster(false)
        alert('Poster generation failed. Please check the API key configuration or try again.')

        // Log failure
        setActionHistory(prev => [
          {
            id: `poster-fail-${Date.now()}`,
            action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt: 'Failed' } },
            agentName: 'PosterAgent',
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
    async (event?: Event) => {
      const detail = event ? customEventDetailRecord(event) : {}
      const projectId = readString(detail.projectId) || currentProject?.id

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
          console.error('Failed to refetch moodboard data:', error)
        }
      })
    },
    [currentProject?.id]
  )

  // Listeners
  useEffect(() => {
    const onStoryboard = (e: Event) => handleStoryboardTrigger(e)
    const onPoster = (e: Event) => handlePosterTrigger(e)
    const onMoodboard = (e: Event) => handleMoodboardTrigger(e)

    window.addEventListener('trigger-storyboard-generation', onStoryboard)
    window.addEventListener('generate-episode-poster', onPoster)
    window.addEventListener('trigger-moodboard-generation', onMoodboard)

    return () => {
      window.removeEventListener('trigger-storyboard-generation', onStoryboard)
      window.removeEventListener('generate-episode-poster', onPoster)
      window.removeEventListener('trigger-moodboard-generation', onMoodboard)
    }
  }, [handleStoryboardTrigger, handlePosterTrigger, handleMoodboardTrigger])

  // Update StoryPlanBoard to pass isGeneratingPoster
  // ... (Wait, I need to check where StoryPlanBoard is rendered to pass the prop)

  // Update primary moodboard background
  const updatePrimaryMoodboard = useCallback(() => {
    if (!currentProject?.id) return
    const savedPrimary = localStorage.getItem(`moodboard-primary-${currentProject.id}`)
    const primaryIdx = savedPrimary !== null ? parseInt(savedPrimary) : null
    if (primaryIdx !== null && storyPlan?.moodImages?.[primaryIdx]) {
      const img = storyPlan.moodImages[primaryIdx]
      // Handle both local filenames and absolute URLs
      if (img.startsWith('http')) {
        setPrimaryMoodboardUrl(img)
      } else {
        setPrimaryMoodboardUrl(`/projects/${currentProject.id}/${img}`)
      }
    } else {
      setPrimaryMoodboardUrl(null)
    }
  }, [currentProject, storyPlan?.moodImages])

  // Listen for primary moodboard changes and generation completion
  useEffect(() => {
    updatePrimaryMoodboard()
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('moodboard-primary-')) {
        updatePrimaryMoodboard()
      }
    }
    const handleCustomEvent = () => updatePrimaryMoodboard()

    // Handle moodboard generation completion from the service
    const handleMoodboardComplete = async (e: Event) => {
      const detail = customEventDetailRecord(e)
      const detailProjectId = readString(detail.projectId)
      if (!detailProjectId || detailProjectId !== currentProject?.id) return

      console.log('📸 [Moodboard] Generation complete, updating UI:', detail)

      const images = recordArrayFromJson(detail.images).map(img => readString(img)).filter((url): url is string => !!url)
      if (images.length > 0) {
        setStoryPlan(prev => {
          if (!prev) return prev
          const currentImages = prev.moodImages ?? []
          const promptIndex = readNumber(detail.promptIndex)

          if (promptIndex !== undefined) {
            const updated = [...currentImages]
            updated[promptIndex] = images[0]
            return { ...prev, moodImages: updated }
          }

          return { ...prev, moodImages: [...currentImages, ...images] }
        })
      }

      try {
        const response = await fetch(`/api/storyteller/projects/${detailProjectId}`)
        if (response.ok) {
          const data = await response.json()
          const bible = data.seriesBible || data.series_bible
          if (bible?.moodImages) {
            setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
          }
        }
      } catch (error) {
        console.error('Failed to refetch moodboard data:', error)
      }

      updatePrimaryMoodboard()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('moodboard-primary-changed', handleCustomEvent)
    window.addEventListener('moodboard-generation-complete', handleMoodboardComplete)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('moodboard-primary-changed', handleCustomEvent)
      window.removeEventListener('moodboard-generation-complete', handleMoodboardComplete)
    }
  }, [updatePrimaryMoodboard, currentProject?.id])

  return {
    handleStoryboardTrigger,
    handlePosterTrigger,
    handleMoodboardTrigger,
    updatePrimaryMoodboard,
  }
}
