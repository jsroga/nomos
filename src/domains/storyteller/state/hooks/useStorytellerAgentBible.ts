'use client'

import { useCallback } from 'react'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { MoodboardFieldAlias } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import {
  StorytellerLogMessage,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { StorytellerToastId } from '@/domains/storyteller/state/constants/agent-trigger-prompts'
import {
  patchStorytellerEpisode,
  patchStorytellerProject,
} from '@/domains/storyteller/core/io/storyteller.api'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
export function useStorytellerAgentBible(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    currentEpisodeId,
    setStoryPlan,
    handleDismissToast,
    setIsSending,
  } = core

  const handleSaveProjectPrompt = useCallback(
    async (prompt: string) => {
      if (!currentProject?.id) return
      try {
        await patchStorytellerProject(currentProject.id, { masterPrompt: prompt })
        if (currentProject) {
          useWorkspaceProjectStore.getState().setCurrentProject({
            ...currentProject,
            master_prompt: prompt,
          })
        }
      } catch (err) {
        console.error(StorytellerLogMessage.FailedSaveMasterPrompt, err)
      }
    },
    [currentProject]
  )

  const handleSaveEpisodePrompt = useCallback(
    async (prompt: string) => {
      if (!currentEpisodeId) return

      try {
        await patchStorytellerEpisode(currentEpisodeId, {
          episode_prompt: prompt,
        })
        handleDismissToast(StorytellerToastId.EpisodePromptSuggestion)
      } catch (err) {
        console.error(StorytellerLogMessage.FailedSaveEpisodePrompt, err)
      }
    },
    [currentEpisodeId, handleDismissToast]
  )

  const handleUpdateGlobalBible = useCallback(
    async (updates: Partial<StoryPlan>) => {
      setIsSending(true)
      try {
        const latestProject = useWorkspaceProjectStore.getState().currentProject
        if (!latestProject?.id) return

        const updateKeys = Object.keys(updates)
        const isMoodImagesOnly =
          updateKeys.length === 1 && updateKeys[0] === MoodboardFieldAlias.MoodImages

        if (isMoodImagesOnly) {
          const newMoodImages = updates.moodImages
          if (!currentEpisodeId) {
            setStoryPlan(prev => (prev ? { ...prev, moodImages: newMoodImages ?? prev.moodImages } : prev))
          }
          useWorkspaceProjectStore.getState().setCurrentProject({
            ...latestProject,
            series_bible: {
              ...parseSeriesBibleRecord(latestProject.series_bible),
              moodImages: newMoodImages,
            },
          })
          await patchStorytellerProject(latestProject.id, {
            seriesBible: { moodImages: newMoodImages },
            storyPlan: { moodImages: newMoodImages },
          })
          return
        }

        const currentBible = parseSeriesBibleRecord(latestProject.series_bible)
        const newBible = { ...currentBible, ...updates }
        useWorkspaceProjectStore.getState().setCurrentProject({
          ...latestProject,
          series_bible: newBible,
        })
        if (!currentEpisodeId) {
          setStoryPlan(prev => applyUpdatesToStoryPlan(prev, updates))
        }
        await patchStorytellerProject(latestProject.id, {
          series_bible: newBible,
          story_plan: newBible,
        })
      } catch (e) {
        console.error(StorytellerLogMessage.FailedSaveGlobalBible, e)
      } finally {
        setIsSending(false)
      }
    },
    [currentEpisodeId, setIsSending, setStoryPlan]
  )

  const handleUpdateBible = async (updates: Partial<StoryPlan>) => {
    setIsSending(true)
    try {
      setStoryPlan(prev =>
        prev
          ? { ...prev, ...updates }
          : applyUpdatesToStoryPlan<StoryPlan>(null, updates)
      )

      if (!currentProject?.id) return

      const mergedBible = { ...parseSeriesBibleRecord(currentProject.series_bible), ...updates }
      useWorkspaceProjectStore.getState().setCurrentProject({
        ...currentProject,
        series_bible: mergedBible,
      })

      await patchStorytellerProject(currentProject.id, {
        series_bible: mergedBible,
        story_plan: mergedBible,
      })
    } catch (e) {
      console.error(StorytellerLogMessage.FailedSaveBible, e)
    } finally {
      setIsSending(false)
    }
  }

  return {
    handleSaveProjectPrompt,
    handleSaveEpisodePrompt,
    handleUpdateGlobalBible,
    handleUpdateBible,
  }
}
