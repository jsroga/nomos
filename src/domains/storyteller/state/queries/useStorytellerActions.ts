'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ActionHistoryEntry, StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import { BibleSection, type PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  getSectionForActionType,
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller/config/action-config'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import {
  fetchStorytellerTimeline,
  postStorytellerAction,
} from '@/domains/storyteller/core/io/storyteller.api'
import { fetchStorytellerCharacters } from '@/domains/storyteller/core/io/character.api'
import { beatCardFromWireRow } from '@/domains/storyteller/state/utils/beat-card-wire'
import { recordArrayFromJson, recordFromJson as jsonRecordFromJson, readString } from '@/shared/data/json-guards'
import { recordFromJson, stringRecordFromJson } from '@/shared/data/deep-merge'
import {
  StorytellerActionExtraResultType,
  StorytellerActionResultType,
  StorytellerActionType,
  StorytellerActionsLog,
  StorytellerActionsStorageKeyPrefix,
  StorytellerActionsUpdatePrefix,
} from '@/domains/storyteller/state/constants/storyteller-actions'

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
    if (currentProject?.id) {
      try {
        const key = `${StorytellerActionsStorageKeyPrefix.ActionHistory}${currentProject.id}`
        const saved = localStorage.getItem(key)
        if (saved) {
          setActionHistory(JSON.parse(saved))
        }
      } catch (e) {
        console.error(StorytellerActionsLog.FailedLoadHistory, e)
      }
    }
  }, [currentProject?.id])

  // Save Action History to LocalStorage
  useEffect(() => {
    if (currentProject?.id) {
      try {
        const key = `${StorytellerActionsStorageKeyPrefix.ActionHistory}${currentProject.id}`
        localStorage.setItem(key, JSON.stringify(actionHistory))
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

      const episodeId = episodeIdRef.current
      try {
        const data = await postStorytellerAction({
          action,
          projectId: currentProject.id,
          episodeId: episodeId,
        })
        const result = jsonRecordFromJson(data.result)
        if (data.success === true) {
          const resultType = readString(result.type)

          // Bible-update branch extracted so the dispatch chain stays under the
          // complexity limit; captures the surrounding setters/action/result.
          const applyBibleUpdatedResult = () => {
            const seriesBible = jsonRecordFromJson(result.seriesBible)
            if (Object.keys(seriesBible).length === 0) return
            const bible = seriesBible
            console.log(StorytellerActionsLog.BibleUpdatedApplying, Object.keys(bible))

            setStoryDecisions(prev => ({ ...prev, ...(bible.userDecisions || {}) }))

            setStoryPlan(prev => {
              const storyPlanUpdates = bible.storyPlan || {}
              const directUpdates = { ...bible }
              delete directUpdates.storyPlan
              const allUpdates = { ...storyPlanUpdates, ...directUpdates }
              const updated = applyUpdatesToStoryPlan(prev, allUpdates)
              console.log(
                StorytellerActionsLog.BibleUpdatedAppliedFields,
                Object.keys(updated).filter(k => updated[k])
              )
              return updated
            })

            if (action.type === StorytellerActionType.UPDATE_EPISODE_ROADMAP && bible.storyPlan) {
              const plan = recordFromJson(bible.storyPlan)
              setStoryPlan(prev => {
                const prevRecord = recordFromJson(prev)
                return Object.assign({}, prev, {
                  sequences: plan.sequences || prevRecord.sequences,
                  episodeRoadmap: plan.episodeRoadmap || prevRecord.episodeRoadmap,
                  seasonStructure: plan.seasonStructure || prevRecord.seasonStructure,
                  executiveSummary: plan.executiveSummary || prevRecord.executiveSummary,
                })
              })
            }

            if (result.characters_synced === true && currentProject?.id) {
              console.log(StorytellerActionsLog.CharactersSyncedRefetch)
              fetchStorytellerCharacters(currentProject.id)
                .then(charData => {
                  if (Array.isArray(charData)) {
                    const mapped = charData
                      .map(row => storytellerCharacterFromRow(row))
                      .filter((character): character is StorytellerCharacter => character !== null)
                    setCharacters(mapped)
                  }
                })
                .catch(e => console.error(StorytellerActionsLog.FailedRefetchCharacters, e))
            }
          }

          if (
            resultType === StorytellerActionResultType.BEAT_CREATED ||
            resultType === StorytellerActionResultType.BEAT_UPDATED ||
            resultType === StorytellerActionResultType.BEAT_DELETED ||
            action.type === StorytellerActionType.CREATE_BEAT
          ) {
            // Beat refresh handled by caller via refreshBeats
          } else if (
            resultType === StorytellerActionResultType.BIBLE_UPDATED ||
            resultType === StorytellerActionExtraResultType.WorldRuleAdded
          ) {
            applyBibleUpdatedResult()
          } else if (
            action.type === StorytellerActionType.UPDATE_SERIES_BIBLE ||
            action.type.startsWith(StorytellerActionsUpdatePrefix.Update)
          ) {
            const payload = recordFromJson(action.payload)
            const payloadFields = payload.updatedFields
              ? recordFromJson(payload.updatedFields)
              : payload

            console.log(
              `${StorytellerActionsLog.ApplyingUpdate} ${action.type} update to state:`,
              Object.keys(payloadFields)
            )

            setStoryDecisions(prev => ({
              ...prev,
              ...stringRecordFromJson(payloadFields.userDecisions),
            }))

            setStoryPlan(prev => {
              const updated = applyUpdatesToStoryPlan(prev, payloadFields)
              console.log(
                StorytellerActionsLog.UpdatedStoryPlanFields,
                Object.keys(updated).filter(k => updated[k])
              )
              return updated
            })

            if (currentProject) {
              const mergedBible = {
                ...recordFromJson(currentProject.series_bible),
                ...payloadFields,
              }
              setCurrentProject({
                ...currentProject,
                series_bible: mergedBible,
              })
            }
          } else if (resultType === StorytellerActionResultType.SCRIPT_UPDATED) {
            const script = readString(result.script)
            if (script) {
              setScript(script)
            } else {
              const seriesBible = jsonRecordFromJson(result.seriesBible)
              const bibleScript = readString(seriesBible.script)
              if (bibleScript) setScript(bibleScript)
            }
          } else if (resultType === StorytellerActionResultType.EPISODE_UPDATED) {
            console.log(StorytellerActionsLog.EpisodeUpdatedApplying)
            const storyPlanUpdate = jsonRecordFromJson(result.storyPlan)
            if (Object.keys(storyPlanUpdate).length > 0) {
              const planUpdate = storyPlanUpdate
              setStoryPlan(prev =>
                Object.assign({}, prev, planUpdate, {
                  premise: planUpdate.premise || recordFromJson(prev).premise,
                })
              )
            }
          }
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
