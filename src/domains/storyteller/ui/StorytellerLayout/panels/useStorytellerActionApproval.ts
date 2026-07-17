import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { toast } from 'sonner'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { recordFromJson } from '@/shared/data/json-guards'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { ActionHistoryStatus, ActionType } from '@/domains/storyteller/core/types/enums'
import { StorytellerLogMessage } from '@/domains/storyteller/core/storyteller-page-wire'
import { ACTION_PREFIX_UPDATE } from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { StorytellerActionApprovalToast } from '@/domains/storyteller/ui/StorytellerLayout/constants/action-approval-toast'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

type ReviewModalState = NonNullable<StorytellerPageSlices['core']['reviewModalAction']>

function findMatchingActionIndex(
  messages: StorytellerPageSlices['chat']['messages'],
  action: WireAgentAction,
): { mIdx: number; aIdx: number } | null {
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

  return found ?? null
}

function markActionExecuting(
  slices: StorytellerPageSlices,
  reviewModalAction: ReviewModalState,
): void {
  const { action, messageIndex, actionIndex } = reviewModalAction
  const { messages, syncActionStatus, updateActionStatus } = slices.chat

  if (action.id) {
    syncActionStatus(action, ApprovalActionStatus.EXECUTING)
    return
  }

  if (messageIndex >= 0) {
    syncActionStatus(action, ApprovalActionStatus.EXECUTING, { messageIndex, actionIndex })
    return
  }

  const found = findMatchingActionIndex(messages, action)
  if (found) {
    updateActionStatus(found.mIdx, found.aIdx, ApprovalActionStatus.EXECUTING)
  }
}

function markActionCommitted(
  slices: StorytellerPageSlices,
  reviewModalAction: ReviewModalState,
): void {
  const { action, messageIndex, actionIndex } = reviewModalAction
  const { messages, syncActionStatus, updateActionStatus } = slices.chat

  if (action.id) {
    syncActionStatus(action, ApprovalActionStatus.COMMITTED)
    return
  }

  if (messageIndex >= 0) {
    syncActionStatus(action, ApprovalActionStatus.COMMITTED, { messageIndex, actionIndex })
    return
  }

  const found = findMatchingActionIndex(messages, action)
  if (found) {
    updateActionStatus(found.mIdx, found.aIdx, ApprovalActionStatus.COMMITTED)
  }
}

function markActionPending(
  slices: StorytellerPageSlices,
  reviewModalAction: ReviewModalState,
): void {
  const { action, messageIndex, actionIndex } = reviewModalAction
  const { syncActionStatus } = slices.chat

  if (action.id) {
    syncActionStatus(action, ApprovalActionStatus.PENDING)
    return
  }

  if (messageIndex >= 0) {
    syncActionStatus(action, ApprovalActionStatus.PENDING, { messageIndex, actionIndex })
  }
}

function applyApprovedActionSideEffects(
  slices: StorytellerPageSlices,
  action: WireAgentAction,
): void {
  const { setStoryPlan, syncFactionsToWorldProject } = slices.core
  const payload = recordFromJson(action.payload)

  if (action.type === ActionType.UPDATE_FACTIONS) {
    const factions = payload.factions
    if (Array.isArray(factions)) {
      setStoryPlan(prev => (prev ? { ...prev, factions } : prev))
      syncFactionsToWorldProject(factions)
      toast.success(StorytellerActionApprovalToast.FactionsUpdated)
    }
    return
  }

  if (action.type === ActionType.UPDATE_WORLD_RULES) {
    const rules = payload.worldRules
    if (Array.isArray(rules)) {
      setStoryPlan(prev => (prev ? { ...prev, worldRules: rules } : prev))
      toast.success(StorytellerActionApprovalToast.WorldRulesUpdated)
    }
    return
  }

  if (action.type !== ActionType.UPDATE_EPISODE_ROADMAP) return

  const roadmap = recordFromJson(payload.episodeRoadmap) ?? payload
  if (Object.keys(roadmap).length === 0) return

  setStoryPlan(prev =>
    applyUpdatesToStoryPlan(prev, {
      sequences: roadmap.episodes ?? roadmap.sequences ?? prev?.sequences,
      seasonStructure: roadmap.seasonStructure ?? prev?.seasonStructure,
      executiveSummary: roadmap.executiveSummary ?? prev?.executiveSummary,
    }),
  )
  toast.success(StorytellerActionApprovalToast.RoadmapUpdated)
}

export function createStorytellerActionApprovalHandlers(slices: StorytellerPageSlices) {
  const approve = async (reviewModalAction: ReviewModalState) => {
    const {
      action,
      messageIndex,
      actionIndex,
      agentName,
    } = reviewModalAction
    const {
      getActionSection,
      setSectionPendingActions,
      setUndoStack,
      storyPlan,
      executeAction,
      setActionHistory,
      setReviewModalAction,
    } = slices.core

    markActionExecuting(slices, reviewModalAction)

    const section = getActionSection(action.type)
    if (section) {
      setSectionPendingActions(prev => {
        if (!prev[section]) return prev
        return { ...prev, [section]: { ...prev[section], isProcessing: true } }
      })
    }

    if (action.type.startsWith(ACTION_PREFIX_UPDATE)) {
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

      applyApprovedActionSideEffects(slices, action)
      markActionCommitted(slices, reviewModalAction)
      setActionHistory(prev => [
        {
          id: `${messageIndex}-${actionIndex}`,
          action,
          agentName,
          status: ActionHistoryStatus.COMMITTED,
          timestamp: new Date(),
        },
        ...prev,
      ])
    } catch (e) {
      console.error(StorytellerLogMessage.ApprovalFailed, e)
      markActionPending(slices, reviewModalAction)
      if (section) {
        setSectionPendingActions(prev => {
          if (!prev[section]) return prev
          return { ...prev, [section]: { ...prev[section], isProcessing: false } }
        })
      }
    }

    setReviewModalAction(null)
  }

  const reject = (reviewModalAction: ReviewModalState) => {
    const { action, messageIndex, actionIndex } = reviewModalAction
    const { syncActionStatus } = slices.chat
    const { getActionSection, setSectionPendingActions, setReviewModalAction } = slices.core

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
  }

  return { approve, reject }
}
