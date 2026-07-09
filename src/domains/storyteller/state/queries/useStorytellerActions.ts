'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ActionHistoryEntry, StreamAgentAction } from '@/domains/storyteller/core/types/ActionTypes'
import { BibleSection, type PhaseId } from '@/domains/storyteller/core/types/Enums'
import {
  getSectionForActionType,
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller/config/action-config'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import type { BeatCard } from '@/domains/storyteller/core/types/StoryTypes'
import { readString, readNumber, recordArrayFromJson } from '@/shared/data/json-guards'
import { recordFromJson, stringRecordFromJson } from '@/shared/data/deep-merge'

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
  setCurrentEpisodeTitle,
  setCurrentPhase,
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
        const key = `actionHistory_${currentProject.id}`
        const saved = localStorage.getItem(key)
        if (saved) {
          setActionHistory(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load action history:', e)
      }
    }
  }, [currentProject?.id])

  // Save Action History to LocalStorage
  useEffect(() => {
    if (currentProject?.id) {
      try {
        const key = `actionHistory_${currentProject.id}`
        localStorage.setItem(key, JSON.stringify(actionHistory))
      } catch (e) {
        console.error('Failed to save action history:', e)
      }
    }
  }, [actionHistory, currentProject?.id])

  const refreshBeats = useCallback(async (episodeId: string) => {
    console.log('🔄 refreshBeats called for episode:', episodeId)
    try {
      const beatsRes = await fetch(`/api/storyteller/timeline?episodeId=${episodeId}`)
      const beatsData = await beatsRes.json()
      const rawBeats = recordArrayFromJson(beatsData.beats)
      if (rawBeats.length > 0) {
        const mappedBeats: BeatCard[] = rawBeats.map(b => {
          const row = recordFromJson(b)
          const id = readString(row.id) ?? ''
          const sequence = readNumber(row.sequence) ?? 0
          const logline =
            readString(row.logline) ?? readString(row.log_line) ?? 'Untitled beat'
          const beatType =
            readString(row.beat_type) ?? readString(row.beatType) ?? 'default'
          const status = readString(row.status) ?? 'proposed'
          const content = readString(row.content)
          const imagePrompt =
            readString(row.image_prompt) ?? readString(row.imagePrompt)
          return {
            id,
            sequence,
            logline,
            beatType,
            status,
            content: content ?? undefined,
            imagePrompt: imagePrompt ?? undefined,
          }
        })
        // Return beats rather than setting them directly - caller should set
        return mappedBeats
      }
    } catch (err) {
      console.error('❌ Failed to refresh beats:', err)
    }
    return null
  }, [])

  const executeAction = useCallback(
    async (action: StreamAgentAction) => {
      if (!currentProject?.id) return

      const episodeId = episodeIdRef.current
      try {
        const res = await fetch('/api/storyteller/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            projectId: currentProject.id,
            episodeId: episodeId,
          }),
        })

        const data = await res.json()
        if (data.success) {
          if (
            data.result?.type === 'beat_created' ||
            data.result?.type === 'beat_updated' ||
            data.result?.type === 'beat_deleted' ||
            action.type === 'CREATE_BEAT'
          ) {
            // Beat refresh handled by caller via refreshBeats
          } else if (
            data.result?.type === 'bible_updated' ||
            data.result?.type === 'world_rule_added'
          ) {
            if (data.result.seriesBible) {
              const bible = data.result.seriesBible
              console.log(
                '📚 [executeAction] Bible updated, applying to state:',
                Object.keys(bible)
              )

              setStoryDecisions(prev => ({
                ...prev,
                ...(bible.userDecisions || {}),
              }))

              setStoryPlan(prev => {
                const storyPlanUpdates = bible.storyPlan || {}
                const directUpdates = { ...bible }
                delete directUpdates.storyPlan
                const allUpdates = { ...storyPlanUpdates, ...directUpdates }
                const updated = applyUpdatesToStoryPlan(prev, allUpdates)
                console.log(
                  '📚 [executeAction] bible_updated - Applied fields:',
                  Object.keys(updated).filter(k => updated[k])
                )
                return updated
              })

              if (action.type === 'UPDATE_EPISODE_ROADMAP' && bible.storyPlan) {
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

              if (data.result.characters_synced && currentProject?.id) {
                console.log('🔄 [executeAction] Characters synced - refetching from characters table')
                fetch(`/api/storyteller/characters?projectId=${currentProject.id}`)
                  .then(res => res.json())
                  .then(charData => {
                    if (Array.isArray(charData)) {
                      const mapped = charData.map(c => ({
                        ...c,
                        stress: c.stressLevel ?? c.stress_level ?? 30,
                        trust: c.trustLevel ?? c.trust_level ?? 50,
                        power: c.powerLevel ?? c.power_level ?? 30,
                        morality: c.moralityLevel ?? c.morality_level ?? 50,
                        hope: c.hopeLevel ?? c.hope_level ?? 60,
                        isolation: c.isolationLevel ?? c.isolation_level ?? 20,
                        transformation:
                          c.transformationProgress ??
                          c.transformation_progress ??
                          c.arcStatus?.transformation ??
                          0,
                        id: c.id || c.characterId,
                        role: c.role || '',
                      }))
                      setCharacters(mapped)
                    }
                  })
                  .catch(e => console.error('Failed to refetch characters after sync', e))
              }
            }
          } else if (action.type === 'UPDATE_SERIES_BIBLE' || action.type.startsWith('UPDATE_')) {
            const payload = recordFromJson(action.payload)
            const payloadFields = payload.updatedFields
              ? recordFromJson(payload.updatedFields)
              : payload

            console.log(
              `📚 [executeAction] Applying ${action.type} update to state:`,
              Object.keys(payloadFields)
            )

            setStoryDecisions(prev => ({
              ...prev,
              ...stringRecordFromJson(payloadFields.userDecisions),
            }))

            setStoryPlan(prev => {
              const updated = applyUpdatesToStoryPlan(prev, payloadFields)
              console.log(
                '📚 [executeAction] Updated storyPlan fields:',
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
          } else if (data.result?.type === 'script_updated') {
            if (data.result.script) {
              setScript(data.result.script)
            } else if (data.result.seriesBible?.script) {
              setScript(data.result.seriesBible.script)
            }
          } else if (data.result?.type === 'episode_updated') {
            console.log('📺 [executeAction] Episode updated, applying premise to state')
            if (data.result.storyPlan) {
              const planUpdate = recordFromJson(data.result.storyPlan)
              setStoryPlan(prev =>
                Object.assign({}, prev, planUpdate, {
                  premise: planUpdate.premise || recordFromJson(prev).premise,
                })
              )
            }
          }
        }
      } catch (error) {
        console.error('❌ executeAction threw:', error)
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
