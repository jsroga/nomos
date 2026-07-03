'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ActionHistoryEntry, AgentAction } from '@/domains/storyteller/core/types/ActionTypes'
import { BibleSection } from '@/domains/storyteller/core/types/Enums'
import {
  getSectionForActionType,
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller/config/action-config'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'

interface Character {
  id: string
  name: string
  [key: string]: any
}

interface ActionsDeps {
  currentProject: any
  currentEpisodeId: string | null
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setStoryDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>
  setScript: React.Dispatch<React.SetStateAction<string>>
  setCurrentEpisodeTitle: React.Dispatch<React.SetStateAction<string>>
  setCurrentPhase: React.Dispatch<React.SetStateAction<string>>
  setCurrentProject: (project: any) => void
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
    action: AgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  } | null>(null)
  const [sectionPendingActions, setSectionPendingActions] = useState<
    Record<
      string,
      {
        section: string
        preview: any
        action: any
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
      if (beatsData.beats && beatsData.beats.length > 0) {
        const mappedBeats = beatsData.beats.map((b: any) => ({
          id: b.id,
          sequence: b.sequence,
          logline: b.logline || b.log_line || 'Untitled beat',
          beatType: b.beat_type || b.beatType || 'default',
          status: b.status || 'proposed',
          content: b.content || null,
          imagePrompt: b.image_prompt || b.imagePrompt || null,
        }))
        // Return beats rather than setting them directly - caller should set
        return mappedBeats
      }
    } catch (err) {
      console.error('❌ Failed to refresh beats:', err)
    }
    return null
  }, [])

  const executeAction = useCallback(
    async (action: AgentAction) => {
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
                  Object.keys(updated).filter(k => (updated as any)[k])
                )
                return updated
              })

              if (action.type === 'UPDATE_EPISODE_ROADMAP' && bible.storyPlan) {
                const plan = bible.storyPlan as any
                setStoryPlan(prev => ({
                  ...(prev || {} as any),
                  sequences: plan.sequences || (prev as any)?.sequences,
                  episodeRoadmap: plan.episodeRoadmap || (prev as any)?.episodeRoadmap,
                  seasonStructure: plan.seasonStructure || (prev as any)?.seasonStructure,
                  executiveSummary: plan.executiveSummary || (prev as any)?.executiveSummary,
                }))
              }

              if (data.result.characters_synced && currentProject?.id) {
                console.log('🔄 [executeAction] Characters synced - refetching from characters table')
                fetch(`/api/storyteller/characters?projectId=${currentProject.id}`)
                  .then(res => res.json())
                  .then(charData => {
                    if (Array.isArray(charData)) {
                      const mapped = charData.map((c: any) => ({
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
            const payload = (action.payload || {}) as any
            const payloadFields = payload.updatedFields || payload

            console.log(
              `📚 [executeAction] Applying ${action.type} update to state:`,
              Object.keys(payloadFields)
            )

            setStoryDecisions(prev => ({
              ...prev,
              ...(payloadFields.userDecisions || {}),
            }))

            setStoryPlan(prev => {
              const updated = applyUpdatesToStoryPlan(prev, payloadFields)
              console.log(
                '📚 [executeAction] Updated storyPlan fields:',
                Object.keys(updated).filter(k => (updated as any)[k])
              )
              return updated
            })

            if (currentProject) {
              const mergedBible = {
                ...((currentProject.series_bible as any) || {}),
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
              setStoryPlan(
                prev =>
                  ({
                    ...prev,
                    ...data.result.storyPlan,
                    premise: data.result.storyPlan.premise || (prev as any)?.premise,
                  }) as any
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
