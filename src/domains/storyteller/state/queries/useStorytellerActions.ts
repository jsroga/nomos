'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ActionHistoryEntry, StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import { BibleSection, type PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  getSectionForActionType,
} from '@/domains/storyteller/config/action-config'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import {
  fetchStorytellerTimeline,
  postStorytellerAction,
} from '@/domains/storyteller/core/io/storyteller.api'
import { beatCardFromWireRow } from '@/domains/storyteller/state/utils/beat-card-wire'
import { recordArrayFromJson, recordFromJson as jsonRecordFromJson, readString } from '@/shared/data/json-guards'
import {
  StorytellerActionsLog,
  StorytellerActionsStorageKeyPrefix,
} from '@/domains/storyteller/state/constants/storyteller-actions'
import { browserStorage } from '@/shared/data/browser-storage'
import { applyStorytellerActionResult } from '@/domains/storyteller/state/utils/apply-storyteller-action-result'

/** Minimal shape the hook needs from the page's project state. */
export interface ProjectLike {
  id: string
  series_bible?: unknown
  master_prompt?: string | null
  [key: string]: unknown
}

interface ActionsDeps {
  currentProject: ProjectLike | null
  currentEpisodeId: string | null
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setStoryDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setCharacters: React.Dispatch<React.SetStateAction<StorytellerCharacter[]>>
  setScript: React.Dispatch<React.SetStateAction<string>>
  setCurrentEpisodeTitle: React.Dispatch<React.SetStateAction<string>>
  setCurrentPhase: React.Dispatch<React.SetStateAction<PhaseId>>
  setCurrentProject: (project: ProjectLike) => void
}

export function useStorytellerActions({
  currentProject,
  currentEpisodeId,
  setStoryPlan,
  setStoryDecisions,
  setCharacters,
  setScript,
  setCurrentProject,
}: ActionsDeps) {
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([])
  const [showToasts, setShowToasts] = useState<ActionHistoryEntry[]>([])
  const [undoStack, setUndoStack] = useState<{ storyPlan: StoryPlan | null; actionId: string }[]>([])
  const [reviewModalAction, setReviewModalAction] = useState<{
    action: StreamAgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  } | null>(null)
  const [sectionPendingActions, setSectionPendingActions] = useState<
    Record<
      string,
      {
        section: string
        preview: unknown
        action: StreamAgentAction
        isProcessing?: boolean
        onAccept: () => void
        onReject: () => void
        onReview?: () => void
        episodeId?: string | null
      }
    >
  >({})

  const pendingActionsRef = useRef<number>(0)
  const episodeIdRef = useRef(currentEpisodeId)
  useEffect(() => {
    episodeIdRef.current = currentEpisodeId
  }, [currentEpisodeId])

  // Load Action History from LocalStorage
  useEffect(() => {
    if (!currentProject?.id) return

    try {
      const key = `${StorytellerActionsStorageKeyPrefix.ActionHistory}${currentProject.id}`
      const saved = browserStorage.getString(key)
      if (saved) {
        queueMicrotask(() => setActionHistory(JSON.parse(saved)))
      }
    } catch (e) {
      console.error(StorytellerActionsLog.FailedLoadHistory, e)
    }
  }, [currentProject?.id])

  // Save Action History to LocalStorage
  useEffect(() => {
    if (currentProject?.id) {
      try {
        const key = `${StorytellerActionsStorageKeyPrefix.ActionHistory}${currentProject.id}`
        browserStorage.setString(key, JSON.stringify(actionHistory))
      } catch (e) {
        console.error(StorytellerActionsLog.FailedSaveHistory, e)
      }
    }
  }, [actionHistory, currentProject?.id])

  const refreshBeats = useCallback(async (episodeId: string) => {
    console.log(StorytellerActionsLog.RefreshBeatsCalled, episodeId)
    try {
      const beatsData = await fetchStorytellerTimeline(episodeId)
      const rawBeats = recordArrayFromJson(beatsData.beats)
      if (rawBeats.length > 0) {
        const mappedBeats = rawBeats
          .map(b => beatCardFromWireRow(b))
          .filter((beat): beat is NonNullable<typeof beat> => beat !== null)
        return mappedBeats
      }
    } catch (err) {
      console.error(StorytellerActionsLog.FailedRefreshBeats, err)
    }
    return null
  }, [])

  const executeAction = useCallback(
    async (action: StreamAgentAction) => {
      if (!currentProject?.id) return

      const payload = jsonRecordFromJson(action.payload)
      const episodeId = readString(payload.episodeId) ?? episodeIdRef.current
      try {
        const data = await postStorytellerAction({
          action,
          projectId: currentProject.id,
          episodeId: episodeId,
        })
        const result = jsonRecordFromJson(data.result)
        if (data.success === true && currentProject) {
          applyStorytellerActionResult({
            action,
            result,
            resultType: readString(result.type),
            currentProject,
            setStoryPlan,
            setStoryDecisions,
            setCharacters,
            setScript,
            setCurrentProject,
          })
        }
      } catch (error) {
        console.error(StorytellerActionsLog.ExecuteActionThrew, error)
      }
    },
    [currentProject, setStoryPlan, setStoryDecisions, setCharacters, setScript, setCurrentProject]
  )

  const getActionSection = useCallback((actionType: string): BibleSection | null => {
    return getSectionForActionType(actionType)
  }, [])

  const handleDismissToast = useCallback((entryId: string) => {
    setShowToasts(prev => prev.filter(e => e.id !== entryId))
  }, [])

  return {
    actionHistory,
    setActionHistory,
    showToasts,
    setShowToasts,
    undoStack,
    setUndoStack,
    reviewModalAction,
    setReviewModalAction,
    sectionPendingActions,
    setSectionPendingActions,
    pendingActionsRef,
    episodeIdRef,
    refreshBeats,
    executeAction,
    getActionSection,
    handleDismissToast,
  }
}
