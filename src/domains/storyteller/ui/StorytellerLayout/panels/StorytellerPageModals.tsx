'use client'

import { toast } from 'sonner'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  ActionHistoryStatus,
  ActionType,
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller'
import { Timeline, ActionApprovalModal } from '../storyteller-dynamic-imports'
import type { StorytellerPageState } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerPageModals(props: StorytellerPageState) {
  const {
    currentEpisodeId,
    beats,
    setSelectedBeatId,
    selectedBeatId,
    pendingQuestions,
    PhaseBackConfirmDialog,
    reviewModalAction,
    setReviewModalAction,
    messages,
    syncActionStatus,
    updateActionStatus,
    getActionSection,
    setSectionPendingActions,
    setUndoStack,
    storyPlan,
    executeAction,
    setStoryPlan,
    setActionHistory,
    syncFactionsToWorldProject,
  } = props

  return (
    <>
      <Timeline
        episodeId={currentEpisodeId}
        beats={beats.map(beat => ({
          id: beat.id,
          sequence: beat.sequence,
          logline: beat.logline,
          beatType: beat.beatType,
          status: beat.status ?? 'proposed',
        }))}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
        pendingQuestions={pendingQuestions}
      />

      {PhaseBackConfirmDialog}

      {reviewModalAction && (
        <ActionApprovalModal
          action={reviewModalAction.action}
          agentName={reviewModalAction.agentName}
          isOpen={!!reviewModalAction}
          isProcessing={
            messages[reviewModalAction.messageIndex]?.actions?.[reviewModalAction.actionIndex]
              ?.status === ApprovalActionStatus.EXECUTING
          }
          onClose={() => setReviewModalAction(null)}
          onApprove={async () => {
            const { action, messageIndex, actionIndex } = reviewModalAction

            if (action.id) {
              syncActionStatus(action, ApprovalActionStatus.EXECUTING)
            } else if (messageIndex >= 0) {
              syncActionStatus(action, ApprovalActionStatus.EXECUTING, { messageIndex, actionIndex })
            } else {
              const found = messages
                .map((m, mIdx) => ({
                  mIdx,
                  aIdx:
                    m.actions?.findIndex(
                      a =>
                        a.type === action.type &&
                        JSON.stringify(a.payload) === JSON.stringify(action.payload),
                    ) ?? -1,
                }))
                .find(res => res.aIdx !== -1)

              if (found) {
                updateActionStatus(found.mIdx, found.aIdx, ApprovalActionStatus.EXECUTING)
              }
            }

            const section = getActionSection(action.type)
            if (section) {
              setSectionPendingActions(prev => {
                if (!prev[section]) return prev
                return {
                  ...prev,
                  [section]: { ...prev[section], isProcessing: true },
                }
              })
            }

            if (action.type.startsWith('UPDATE_')) {
              const actionId = `${messageIndex}-${actionIndex}`
              setUndoStack(prev => [
                ...prev.slice(-4),
                { storyPlan: storyPlan ? { ...storyPlan } : null, actionId },
              ])
            }

            try {
              await executeAction(action)

              if (section) {
                setSectionPendingActions(prev => {
                  const { [section]: _, ...rest } = prev
                  return rest
                })
              }

              if (action.type === ActionType.UPDATE_FACTIONS) {
                const payload = recordFromJson(action.payload)
                const factions = payload.factions
                if (Array.isArray(factions)) {
                  setStoryPlan(prev => (prev ? { ...prev, factions } : prev))
                  syncFactionsToWorldProject(factions)
                  toast.success('Factions updated')
                }
              } else if (action.type === ActionType.UPDATE_WORLD_RULES) {
                const payload = recordFromJson(action.payload)
                const rules = payload.worldRules
                if (Array.isArray(rules)) {
                  setStoryPlan(prev => (prev ? { ...prev, worldRules: rules } : prev))
                  toast.success('World rules updated')
                }
              } else if (action.type === ActionType.UPDATE_EPISODE_ROADMAP) {
                const payload = recordFromJson(action.payload)
                const roadmap = recordFromJson(payload.episodeRoadmap) ?? payload

                if (Object.keys(roadmap).length > 0) {
                  setStoryPlan(prev =>
                    applyUpdatesToStoryPlan(prev, {
                      sequences:
                        roadmap.episodes ?? roadmap.sequences ?? prev?.sequences,
                      seasonStructure: roadmap.seasonStructure ?? prev?.seasonStructure,
                      executiveSummary: roadmap.executiveSummary ?? prev?.executiveSummary,
                    }),
                  )
                  toast.success('Roadmap updated')
                }
              }

              if (action.id) {
                syncActionStatus(action, ApprovalActionStatus.COMMITTED)
              } else if (messageIndex >= 0) {
                syncActionStatus(action, ApprovalActionStatus.COMMITTED, { messageIndex, actionIndex })
              } else {
                const found = messages
                  .map((m, mIdx) => ({
                    mIdx,
                    aIdx:
                      m.actions?.findIndex(
                        a =>
                          a.type === action.type &&
                          JSON.stringify(a.payload) === JSON.stringify(action.payload),
                      ) ?? -1,
                  }))
                  .find(res => res.aIdx !== -1)

                if (found) {
                  updateActionStatus(found.mIdx, found.aIdx, ApprovalActionStatus.COMMITTED)
                }
              }
              setActionHistory(prev => [
                {
                  id: `${messageIndex}-${actionIndex}`,
                  action,
                  agentName: reviewModalAction.agentName,
                  status: ActionHistoryStatus.COMMITTED,
                  timestamp: new Date(),
                },
                ...prev,
              ])
            } catch (e) {
              console.error('Approval failed', e)
              if (action.id) {
                syncActionStatus(action, ApprovalActionStatus.PENDING)
              } else if (messageIndex >= 0) {
                syncActionStatus(action, ApprovalActionStatus.PENDING, { messageIndex, actionIndex })
              }
              if (section) {
                setSectionPendingActions(prev => {
                  if (!prev[section]) return prev
                  return {
                    ...prev,
                    [section]: { ...prev[section], isProcessing: false },
                  }
                })
              }
            }
            setReviewModalAction(null)
          }}
          onReject={() => {
            const { action, messageIndex, actionIndex } = reviewModalAction
            if (action.id) {
              syncActionStatus(action, ApprovalActionStatus.REJECTED)
            } else if (messageIndex >= 0) {
              syncActionStatus(action, ApprovalActionStatus.REJECTED, { messageIndex, actionIndex })
            }
            const section = getActionSection(action.type)
            if (section) {
              setSectionPendingActions(prev => {
                const { [section]: _, ...rest } = prev
                return rest
              })
            }
            setReviewModalAction(null)
          }}
        />
      )}
    </>
  )
}
