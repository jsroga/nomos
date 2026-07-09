'use client'

import React, { useMemo } from 'react'
import type { StreamAgentAction, ActionHistoryEntry } from '@/domains/storyteller/core/types/ActionTypes'
import { ActionHistoryStatus, ActionType } from '@/domains/storyteller/core/types/Enums'
import { StorytellerLogMessage, StorytellerActionPrefix } from '@/domains/storyteller/core/storyteller-page-wire'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import type { BibleSection } from '@/domains/storyteller/core/types/Enums'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ActionCommitted, ActionSuggestion } from './storyteller-dynamic-imports'

export interface StoryActionRendererDeps {
  storyPlan: StoryPlan | null
  undoStack: Array<{ storyPlan: StoryPlan | null; actionId: string }>
  setUndoStack: React.Dispatch<
    React.SetStateAction<Array<{ storyPlan: StoryPlan | null; actionId: string }>>
  >
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setCharacters: React.Dispatch<React.SetStateAction<StorytellerCharacter[]>>
  setActionHistory: React.Dispatch<React.SetStateAction<ActionHistoryEntry[]>>
  setReviewModalAction: React.Dispatch<
    React.SetStateAction<{
      action: WireAgentAction
      agentName: string
      messageIndex: number
      actionIndex: number
    } | null>
  >
  setSectionPendingActions: React.Dispatch<
    React.SetStateAction<
      Record<
        string,
        {
          section: string
          preview: unknown
          action: WireAgentAction
          isProcessing?: boolean
          onAccept: () => void
          onReject: () => void
          onReview?: () => void
        }
      >
    >
  >
  syncActionStatus: (
    action: StreamAgentAction,
    status: ApprovalActionStatus,
    indices?: { messageIndex: number; actionIndex: number }
  ) => void
  executeAction: (action: StreamAgentAction) => Promise<void>
  getActionSection: (type: string) => BibleSection | null
}

export function useStoryActionRenderer(deps: StoryActionRendererDeps) {
  const {
    storyPlan,
    undoStack,
    setUndoStack,
    setStoryPlan,
    setCharacters,
    setActionHistory,
    setReviewModalAction,
    setSectionPendingActions,
    syncActionStatus,
    executeAction,
    getActionSection,
  } = deps

  return useMemo(() => {
    return React.memo(function ActionComponentInner({
      action,
      agentName,
      messageIndex,
      actionIndex,
    }: {
      action: StreamAgentAction
      agentName: string
      messageIndex: number
      actionIndex: number
    }) {
      const status = action.status ?? ApprovalActionStatus.PENDING
      const actionId = `${messageIndex}-${actionIndex}`
      const section = getActionSection(action.type)

      const handleApprove = async () => {
        syncActionStatus(action, ApprovalActionStatus.EXECUTING, { messageIndex, actionIndex })

        if (section) {
          setSectionPendingActions(prev => {
            const existing = prev[section]
            if (!existing) return prev
            return { ...prev, [section]: { ...existing, isProcessing: true } }
          })
        }

        if (action.type.startsWith(StorytellerActionPrefix.Update)) {
          setUndoStack(prev => [
            ...prev.slice(-4),
            { storyPlan: storyPlan ? { ...storyPlan } : null, actionId },
          ])
        }

        try {
          await executeAction(action)
          syncActionStatus(action, ApprovalActionStatus.COMMITTED, { messageIndex, actionIndex })

          if (section) {
            setSectionPendingActions(prev => {
              const { [section]: _, ...rest } = prev
              return rest
            })
          }

          setActionHistory(prev => [
            {
              id: actionId,
              action,
              agentName,
              status: ActionHistoryStatus.COMMITTED,
              timestamp: new Date(),
            },
            ...prev,
          ])
        } catch (e) {
          console.error(StorytellerLogMessage.ApprovalFailed, e)
          syncActionStatus(action, ApprovalActionStatus.PENDING, { messageIndex, actionIndex })

          if (section) {
            setSectionPendingActions(prev => {
              const existing = prev[section]
              if (!existing) return prev
              return { ...prev, [section]: { ...existing, isProcessing: false } }
            })
          }

          setUndoStack(prev => prev.filter(u => u.actionId !== actionId))
        }
      }

      const handleReject = () => {
        syncActionStatus(action, ApprovalActionStatus.REJECTED, { messageIndex, actionIndex })
        if (section) {
          setSectionPendingActions(prev => {
            const { [section]: _, ...rest } = prev
            return rest
          })
        }
      }

      const handleUndo = async () => {
        const undoEntry = undoStack.find(u => u.actionId === actionId)

        if (undoEntry?.storyPlan) {
          setStoryPlan(undoEntry.storyPlan)
          setUndoStack(prev => prev.filter(u => u.actionId !== actionId))
          syncActionStatus(action, ApprovalActionStatus.REJECTED, { messageIndex, actionIndex })
        }

        if (action.type === ActionType.CREATE_CHARACTER) {
          const payload = recordFromJson(action.payload)
          const charName =
            readString(payload.name) ?? readString(recordFromJson(payload.character).name)
          if (charName) {
            setCharacters(prev =>
              prev.filter(c => c.name.toLowerCase() !== charName.toLowerCase())
            )
          }
          syncActionStatus(action, ApprovalActionStatus.REJECTED, { messageIndex, actionIndex })
        }
      }

      const canUndo =
        (action.type.startsWith(StorytellerActionPrefix.Update) &&
          undoStack.some(u => u.actionId === actionId)) ||
        action.type === ActionType.CREATE_CHARACTER

      if (status === ApprovalActionStatus.COMMITTED) {
        return (
          <ActionCommitted
            entry={{
              id: actionId,
              action,
              agentName,
              timestamp: new Date(),
              status: ActionHistoryStatus.COMMITTED,
            }}
            compact
            onUndo={handleUndo}
            canUndo={canUndo}
          />
        )
      }

      if (status === ApprovalActionStatus.REJECTED) {
        return (
          <div className="text-[10px] text-red-400/60 uppercase tracking-widest px-2 italic">
            Discarded
          </div>
        )
      }

      const handleReview = () => {
        setReviewModalAction({ action, agentName, messageIndex, actionIndex })
      }

      return (
        <ActionSuggestion
          action={action}
          agentName={agentName}
          onAccept={handleApprove}
          onReview={handleReview}
          onReject={handleReject}
          isProcessing={status === ApprovalActionStatus.EXECUTING}
        />
      )
    })
  }, [
    executeAction,
    getActionSection,
    setActionHistory,
    setCharacters,
    setReviewModalAction,
    setSectionPendingActions,
    setStoryPlan,
    setUndoStack,
    storyPlan,
    syncActionStatus,
    undoStack,
  ])
}
