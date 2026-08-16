'use client'

import { useCallback } from 'react'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import {
  StorytellerDefaultTitle,
  StorytellerLogMessage,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import { useStorytellerAgentBible } from './useStorytellerAgentBible'

/**
 * Storyteller workspace agent actions. The legacy chat-driven flows (questions,
 * premise/roadmap generation triggers, world-bible chat send) were removed with
 * the chat engine; what remains is the real bible editing + panel/character-web
 * state.
 */
export function useStorytellerAgents(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    storyPlan,
    setIsActivityPanelOpen,
    setFocusEntityId,
    loadingStates,
  } = core

  const bibleHandlers = useStorytellerAgentBible(core)

  const worldBiblePanelStoryPlan =
    storyPlan ??
    applyUpdatesToStoryPlan(null, {
      title: currentProject?.name || StorytellerDefaultTitle.Untitled,
      genre: '',
      tone: '',
      centralQuestion: '',
      themes: [],
      worldRules: [],
      factions: [],
      moodImages: [],
    })

  const closeWorldBiblePanel = useCallback(() => {
    getStorytellerUiStore().setWorldBibleOpen(false)
  }, [])

  const toggleActivityPanel = useCallback(() => {
    setIsActivityPanelOpen(prev => !prev)
  }, [setIsActivityPanelOpen])

  const chatActiveOperations = loadingStates.operations.map(op => ({
    id: op.id,
    type: op.section,
    label: op.label,
    startTime: op.startTime,
    tool: op.details,
  }))

  const handleCharacterWebNodeClick = useCallback(
    (nodeId: string, type: unknown) => {
      console.log(StorytellerLogMessage.CharacterWebNodeClicked, nodeId, type)
      setFocusEntityId(null)
    },
    [setFocusEntityId]
  )

  return {
    ...bibleHandlers,
    worldBiblePanelStoryPlan,
    closeWorldBiblePanel,
    toggleActivityPanel,
    chatActiveOperations,
    handleCharacterWebNodeClick,
  }
}
