import {
  actionRequiresApproval,
  getSectionForActionType,
} from '@/domains/storyteller/config/action-config'
import { ActionHistoryStatus } from '@/domains/storyteller/core/types/enums'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import type { ActionHistoryEntry } from '@/domains/storyteller/core/types/action-types'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ChatSenderName } from '@/domains/storyteller/core/io/constants/chat-route'
import { StorytellerChatLog } from '@/domains/storyteller/state/constants/storyteller-chat'

type SyncActionStatus = (
  action: WireAgentAction,
  status: ApprovalActionStatus,
  location?: { messageIndex: number; actionIndex: number }
) => void

type SectionPendingAction = {
  section: string
  preview: unknown
  action: WireAgentAction
  isProcessing?: boolean
  onAccept: () => void
  onReject: () => void
  onReview?: () => void
}

interface StorytellerStreamActionContext {
  executeAction: (action: WireAgentAction) => Promise<void>
  syncActionStatus: SyncActionStatus
  setActionHistory: React.Dispatch<React.SetStateAction<ActionHistoryEntry[]>>
  setSectionPendingActions: React.Dispatch<
    React.SetStateAction<Record<string, SectionPendingAction>>
  >
  setReviewModalAction: (value: {
    action: WireAgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  } | null) => void
}

function createCommittedHistoryEntry(action: WireAgentAction): ActionHistoryEntry {
  return {
    id: `stream-${Date.now()}`,
    action,
    agentName: ChatSenderName.Storyteller,
    status: ActionHistoryStatus.COMMITTED,
    timestamp: new Date(),
  }
}

function logActionDebug(message: string, detail?: unknown): void {
  if (process.env.NEXT_PUBLIC_CHAT_DEBUG !== '1') return
  console.log(message, detail)
}

function createSectionAcceptHandler(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction,
  section: string
): () => Promise<void> {
  return async () => {
    logActionDebug(`${StorytellerChatLog.SectionAccept} ${action.type} for ${section}`)
    if (action.id) {
      ctx.syncActionStatus(action, ApprovalActionStatus.EXECUTING)
    }
    ctx.setSectionPendingActions(prev => {
      if (!prev[section]) return prev
      return { ...prev, [section]: { ...prev[section], isProcessing: true } }
    })

    try {
      await ctx.executeAction(action)
      if (action.id) {
        ctx.syncActionStatus(action, ApprovalActionStatus.COMMITTED)
      }
      ctx.setSectionPendingActions(prev => {
        const { [section]: _, ...rest } = prev
        return rest
      })
      ctx.setActionHistory(prev => [createCommittedHistoryEntry(action), ...prev.slice(0, 49)])
    } catch (e) {
      console.error(StorytellerChatLog.SectionAcceptFailed, e)
      if (action.id) {
        ctx.syncActionStatus(action, ApprovalActionStatus.PENDING)
      }
      ctx.setSectionPendingActions(prev => {
        if (!prev[section]) return prev
        return { ...prev, [section]: { ...prev[section], isProcessing: false } }
      })
    }
  }
}

function createSectionRejectHandler(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction,
  section: string
): () => void {
  return () => {
    logActionDebug(`${StorytellerChatLog.SectionReject} ${action.type} for ${section}`)
    if (action.id) {
      ctx.syncActionStatus(action, ApprovalActionStatus.REJECTED)
    }
    ctx.setSectionPendingActions(prev => {
      const { [section]: _, ...rest } = prev
      return rest
    })
  }
}

function registerSectionPendingAction(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction,
  section: string
): void {
  logActionDebug(`${StorytellerChatLog.ActionPendingOverlay} ${section}`)
  ctx.setSectionPendingActions(prev => ({
    ...prev,
    [section]: {
      section,
      preview: action.payload,
      action,
      onAccept: createSectionAcceptHandler(ctx, action, section),
      onReject: createSectionRejectHandler(ctx, action, section),
      onReview: () =>
        ctx.setReviewModalAction({
          action,
          agentName: ChatSenderName.Storyteller,
          messageIndex: -1,
          actionIndex: -1,
        }),
    },
  }))
}

async function handleApprovalRequiredAction(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction
): Promise<void> {
  logActionDebug(`${StorytellerChatLog.ActionReceived} ${action.type} - awaiting user approval`, {
    payload: action.payload ? Object.keys(recordKeys(action.payload)) : StorytellerChatLog.NoPayload,
    status: action.status,
  })

  const section = getSectionForActionType(action.type)
  logActionDebug(`${StorytellerChatLog.ActionMapped} '${action.type}' -> '${section}'`)
  if (!section || section === BibleSection.FULL) return
  registerSectionPendingAction(ctx, action, section)
}

function recordKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  return Object.keys(payload)
}

async function handleImmediateAction(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction
): Promise<void> {
  await ctx.executeAction(action)
  ctx.setActionHistory(prev => [createCommittedHistoryEntry(action), ...prev])
  logActionDebug(StorytellerChatLog.ActionCommitted, action.type)
}

async function processStorytellerStreamAction(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction
): Promise<void> {
  const requiresApproval = actionRequiresApproval(action.type, action.status)
  if (requiresApproval) {
    await handleApprovalRequiredAction(ctx, action)
    return
  }
  await handleImmediateAction(ctx, action)
}

export function runStorytellerStreamAction(
  ctx: StorytellerStreamActionContext,
  action: WireAgentAction
): void {
  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') {
    console.log(StorytellerChatLog.ActionReceived, action.type)
  }

  void (async () => {
    try {
      await processStorytellerStreamAction(ctx, action)
    } catch (err) {
      console.error(StorytellerChatLog.ActionFailed, action.type, err)
    }
  })()
}
