import { v4 as uuidv4 } from 'uuid'
import { AgentAction, ActionHistoryEntry, ActionHistory } from './types'
import { WritersRoomState, BeatCard, Setup, Phase } from '../types'
import { BeatType, BeatStatus, ActionStatus } from '../enums'
import { analyzeChangeRisk, shouldRunConsistencyCheck } from '../consistency/risk-analyzer'
import { runConsistencyCheck } from '../agents/v2/consistency-agent'
import { applyCascadingFixes } from '../consistency/cascade-editor'
import { getUndoManager } from '../consistency/undo-manager'
import { StoryContext, ConsistencyCheckResult } from '../consistency/types'
import { WorldRule } from '../schemas/agent-schemas'
import { deepMerge } from '../config/action-config'

// ============================================
// ACTION EXECUTOR - Commits actions to state
// ============================================

export class ActionExecutor {
  private history: ActionHistory = {
    entries: [],
    currentIndex: -1,
  }

  /**
   * Execute an action and update state
   */
  async execute(
    state: WritersRoomState,
    action: AgentAction,
    agentName: string,
    options?: { skipConsistencyCheck?: boolean; projectId?: string; episodeId?: string }
  ): Promise<{
    state: WritersRoomState
    entry: ActionHistoryEntry
    consistencyResult?: ConsistencyCheckResult
  }> {
    // Create history entry
    const entry: ActionHistoryEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      agentName,
      action,
      previousState: this.captureRelevantState(state, action),
      status: ActionStatus.COMMITTED,
    }

    // Execute the action
    const newState = await this.executeAction(state, action)

    // Add to history (clear any "future" entries if we're not at the end)
    this.history.entries = this.history.entries.slice(0, this.history.currentIndex + 1)
    this.history.entries.push(entry)
    this.history.currentIndex = this.history.entries.length - 1

    // ============================================
    // CONSISTENCY CHECKING (if enabled)
    // ============================================
    let consistencyResult: ConsistencyCheckResult | undefined

    if (!options?.skipConsistencyCheck && options?.projectId) {
      try {
        // 1. Analyze risk
        const context: StoryContext = {
          projectId: options.projectId,
          episodeId: options.episodeId,
          characters: newState.characters,
          beats: newState.beatBoard,
          seriesBible: newState.seriesBible,
          worldRules: newState.seriesBible?.worldRules || [],
        }

        const risk = analyzeChangeRisk(action, context)

        console.log('[Action Executor] Risk analysis:', risk)

        // 2. Run consistency check if needed
        if (shouldRunConsistencyCheck(risk, context)) {
          console.log('[Action Executor] Running consistency check...')

          consistencyResult = await runConsistencyCheck(context, action)

          // 3. Auto-apply fixes if any were found
          if (consistencyResult.fixes.length > 0) {
            console.log(
              '[Action Executor] Applying',
              consistencyResult.fixes.length,
              'consistency fixes'
            )

            const cascadeResult = await applyCascadingFixes(
              consistencyResult.fixes,
              options.projectId,
              options.episodeId
            )

            // 4. Record for undo
            const undoManager = getUndoManager()
            undoManager.recordConsistencyFix(consistencyResult.fixes, cascadeResult.results)

            console.log('[Action Executor] Consistency fixes applied:', cascadeResult.totalAffected)
          } else {
            console.log('[Action Executor] No inconsistencies detected')
          }
        }
      } catch (error) {
        console.error('[Action Executor] Consistency check failed:', error)
        // Don't fail the action if consistency check fails
      }
    }

    return { state: newState, entry, consistencyResult }
  }

  /**
   * Undo the last action
   */
  async undo(
    state: WritersRoomState
  ): Promise<{ state: WritersRoomState; entry?: ActionHistoryEntry }> {
    if (this.history.currentIndex < 0) {
      return { state } // Nothing to undo
    }

    const entry = this.history.entries[this.history.currentIndex]
    entry.status = ActionStatus.UNDONE

    // Restore previous state
    const newState = this.restoreState(state, entry)
    this.history.currentIndex--

    return { state: newState, entry }
  }

  /**
   * Redo the last undone action
   */
  async redo(
    state: WritersRoomState
  ): Promise<{ state: WritersRoomState; entry?: ActionHistoryEntry }> {
    if (this.history.currentIndex >= this.history.entries.length - 1) {
      return { state } // Nothing to redo
    }

    this.history.currentIndex++
    const entry = this.history.entries[this.history.currentIndex]
    entry.status = ActionStatus.REDONE

    const newState = await this.executeAction(state, entry.action)
    return { state: newState, entry }
  }

  /**
   * Get action history
   */
  getHistory(): ActionHistoryEntry[] {
    return this.history.entries
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = { entries: [], currentIndex: -1 }
  }

  // ============================================
  // Private methods
  // ============================================

  private async executeAction(
    state: WritersRoomState,
    action: AgentAction
  ): Promise<WritersRoomState> {
    switch (action.type) {
      // BEAT OPERATIONS
      case 'CREATE_BEAT': {
        const newBeat: BeatCard = {
          id: uuidv4(),
          episodeId: state.episodeId || 'default',
          sequence: state.beatBoard.length + 1,
          logline: action.payload.logline,
          beatType: action.payload.beatType || BeatType.COMPLICATION,
          charactersInvolved: action.payload.charactersInvolved || [],
          emotionalShifts: action.payload.emotionalShifts || {},
          visualHook: action.payload.visualHook || '',
          causalDependencies: action.payload.causalDependencies || [],
          setupsPayoffs: action.payload.setupsPayoffs || {},
          status: BeatStatus.PROPOSED,
          mazurElements: action.payload.mazurElements,
        }
        return {
          ...state,
          beatBoard: [...state.beatBoard, newBeat],
          currentBeat: newBeat,
        }
      }

      case 'UPDATE_BEAT': {
        const { beatId, updates } = action.payload
        return {
          ...state,
          beatBoard: state.beatBoard.map(beat =>
            beat.id === beatId ? { ...beat, ...updates } : beat
          ),
          currentBeat:
            state.currentBeat?.id === beatId
              ? { ...state.currentBeat, ...updates }
              : state.currentBeat,
        }
      }

      case 'DELETE_BEAT': {
        const { beatId } = action.payload
        const deletedBeat = state.beatBoard.find(b => b.id === beatId)
        return {
          ...state,
          beatBoard: state.beatBoard.filter(beat => beat.id !== beatId),
          rejectedBeats: deletedBeat ? [...state.rejectedBeats, deletedBeat] : state.rejectedBeats,
          currentBeat: state.currentBeat?.id === beatId ? undefined : state.currentBeat,
        }
      }

      case 'REORDER_BEATS': {
        const { beatIds } = action.payload
        const reorderedBeats = beatIds
          .map((id, idx) => {
            const beat = state.beatBoard.find(b => b.id === id)
            return beat ? { ...beat, sequence: idx + 1 } : null
          })
          .filter(Boolean) as BeatCard[]
        return {
          ...state,
          beatBoard: reorderedBeats,
        }
      }

      case 'LOCK_BEAT_BOARD': {
        return {
          ...state,
          beatBoard: state.beatBoard.map(beat => ({
            ...beat,
            status: BeatStatus.APPROVED,
          })),
          currentPhase: Phase.WRITING,
        }
      }

      // CHARACTER OPERATIONS
      // CHARACTER OPERATIONS
      case 'CREATE_CHARACTER': {
        const newChar = {
          characterId: uuidv4(),
          name: action.payload.name,
          role: action.payload.role,
          currentGoals: [],
          fears: [],
          selfDelusion: '',
          actualMotivation: '',
          knowledgeState: [],
          // Initialize metrics (Default state)
          metrics: {
            valence: 0,
            arousal: 50,
            autonomy: 60,
            competence: 60,
            relatedness: 50,
            cognitiveClarity: 70,
            perceivedStakes: 40,
            socialSafety: 60,
            moralAlignment: 70,
            transformation: 0,
          },
          metricsHistory: [],
        }
        return {
          ...state,
          characters: [...state.characters, newChar],
        }
      }

      case 'UPDATE_CHARACTER': {
        const { characterId, updates } = action.payload
        return {
          ...state,
          characters: state.characters.map(char =>
            char.characterId === characterId ? { ...char, ...updates } : char
          ),
        }
      }

      case 'UPDATE_STRESS_LEVEL': {
        const { characterId, delta } = action.payload
        return {
          ...state,
          characters: state.characters.map(char => {
            if (char.characterId !== characterId) return char
            const currentStress = char.metrics?.arousal ?? 50 // Map stress to arousal
            const newStress = Math.max(0, Math.min(100, currentStress + delta))
            return {
              ...char,
              metrics: {
                ...char.metrics,
                arousal: newStress,
              },
            }
          }),
        }
      }

      case 'ADD_KNOWLEDGE': {
        const { characterId, knowledge } = action.payload
        return {
          ...state,
          characters: state.characters.map(char =>
            char.characterId === characterId
              ? { ...char, knowledgeState: [...char.knowledgeState, knowledge] }
              : char
          ),
        }
      }

      // SCRIPT OPERATIONS
      case 'UPDATE_SCRIPT': {
        return {
          ...state,
          script: action.payload.content,
          scriptVersion: (state.scriptVersion || 0) + 1,
        }
      }

      case 'INSERT_SCRIPT_SECTION': {
        return {
          ...state,
          script: (state.script || '') + '\n\n' + action.payload.content,
          scriptVersion: (state.scriptVersion || 0) + 1,
        }
      }

      case 'REVISE_SCRIPT_SECTION': {
        // For now, just append to script
        return {
          ...state,
          script: (state.script || '') + '\n\n' + action.payload.newContent,
          scriptVersion: (state.scriptVersion || 0) + 1,
        }
      }

      // SERIES BIBLE OPERATIONS
      case 'UPDATE_SERIES_BIBLE': {
        return {
          ...state,
          seriesBible: {
            ...state.seriesBible,
            ...action.payload,
          },
        }
      }

      case 'UPDATE_EPISODE_PREMISE': {
        // Deep merge premise fields instead of replacing entirely
        // This allows updating just fatalFlaw without losing stakes, etc.
        return {
          ...state,
          episodePremise: deepMerge(
            state.episodePremise || {},
            action.payload.premise || {}
          ),
          episodeId: action.payload.episodeId || state.episodeId,
        }
      }

      case 'ADD_WORLD_RULE': {
        const currentRules = state.seriesBible?.worldRules || []
        const newRule: WorldRule = {
          category: 'Physics', // Default category
          rule: action.payload.rule,
          consequence: 'The world ceases to make sense.',
          exceptions: null,
        }
        return {
          ...state,
          seriesBible: {
            ...state.seriesBible,
            worldRules: [...currentRules, newRule],
          },
        }
      }

      case 'ADD_SETUP': {
        const newSetup: Setup = {
          id: uuidv4(),
          description: action.payload.description,
          beatId: action.payload.beatId,
          isResolved: false,
        }
        return {
          ...state,
          unresolvedSetups: [...state.unresolvedSetups, newSetup],
        }
      }

      case 'RESOLVE_SETUP': {
        const { setupId, payoffBeatId } = action.payload
        return {
          ...state,
          unresolvedSetups: state.unresolvedSetups.map(setup =>
            setup.id === setupId ? { ...setup, isResolved: true, payoffBeatId } : setup
          ),
        }
      }

      default:
        console.warn('Unknown or unhandled action type:', (action as AgentAction).type)
        return state
    }
  }

  private captureRelevantState(
    state: WritersRoomState,
    action: AgentAction
  ): Partial<WritersRoomState> {
    // Capture only the relevant part of state for efficient undo
    switch (action.type) {
      case 'CREATE_BEAT':
      case 'UPDATE_BEAT':
      case 'DELETE_BEAT':
      case 'REORDER_BEATS':
      case 'LOCK_BEAT_BOARD':
        return { beatBoard: [...state.beatBoard], currentBeat: state.currentBeat }

      case 'CREATE_CHARACTER':
      case 'UPDATE_CHARACTER':
      case 'UPDATE_STRESS_LEVEL':
      case 'ADD_KNOWLEDGE':
        return { characters: [...state.characters] }

      case 'UPDATE_SCRIPT':
      case 'INSERT_SCRIPT_SECTION':
      case 'REVISE_SCRIPT_SECTION':
        return { script: state.script, scriptVersion: state.scriptVersion }

      case 'UPDATE_SERIES_BIBLE':
      case 'ADD_WORLD_RULE':
        return { seriesBible: { ...state.seriesBible } }

      case 'UPDATE_EPISODE_PREMISE':
        return { episodePremise: state.episodePremise ? { ...state.episodePremise } : undefined }

      case 'ADD_SETUP':
      case 'RESOLVE_SETUP':
        return { unresolvedSetups: [...state.unresolvedSetups] }

      default:
        return {}
    }
  }

  private restoreState(state: WritersRoomState, entry: ActionHistoryEntry): WritersRoomState {
    return {
      ...state,
      ...entry.previousState,
    }
  }
}

// Singleton instance
export const actionExecutor = new ActionExecutor()

// ============================================
// APPROVAL WORKFLOW
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved'

export interface PendingApproval {
  id: string
  action: AgentAction
  agentName: string
  timestamp: Date
  context: string
  status: ApprovalStatus
  reason?: string
  autoApproveAfter?: Date
}

// Pending approvals queue
const pendingApprovals: PendingApproval[] = []

// Actions that ALWAYS require approval
const CRITICAL_ACTIONS = ['DELETE_BEAT', 'LOCK_BEAT_BOARD', 'REORDER_BEATS']

// Actions that can be auto-approved
const AUTO_APPROVE_ACTIONS = [
  'UPDATE_CHARACTER_METRICS',
  'UPDATE_STRESS_LEVEL',
  'ADD_KNOWLEDGE',
  'ADD_SETUP',
  'RESOLVE_SETUP',
  'ADD_WORLD_RULE',
]

/**
 * Check if an action requires user approval
 */
export function requiresApproval(action: AgentAction): boolean {
  return CRITICAL_ACTIONS.includes(action.type)
}

/**
 * Check if an action can be auto-approved
 */
export function isSafeAction(action: AgentAction): boolean {
  return AUTO_APPROVE_ACTIONS.includes(action.type)
}

/**
 * Add an action to the approval queue
 */
export function queueForApproval(
  action: AgentAction,
  agentName: string,
  context: string,
  autoApproveDelayMs?: number
): PendingApproval {
  const approval: PendingApproval = {
    id: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action,
    agentName,
    timestamp: new Date(),
    context,
    status: 'pending',
    autoApproveAfter: autoApproveDelayMs ? new Date(Date.now() + autoApproveDelayMs) : undefined,
  }

  pendingApprovals.push(approval)
  console.log(`Action queued for approval: ${action.type} by ${agentName}`)

  return approval
}

/**
 * Approve a pending action
 */
export async function approveAction(
  approvalId: string,
  state: WritersRoomState,
  options?: { projectId?: string; episodeId?: string }
): Promise<{
  success: boolean
  newState?: WritersRoomState
  error?: string
  consistencyResult?: ConsistencyCheckResult
}> {
  const approval = pendingApprovals.find(a => a.id === approvalId)

  if (!approval) {
    return { success: false, error: 'Approval not found' }
  }

  if (approval.status !== 'pending') {
    return { success: false, error: `Action already ${approval.status}` }
  }

  try {
    const { state: newState, consistencyResult } = await actionExecutor.execute(
      state,
      approval.action,
      approval.agentName,
      options
    )

    approval.status = 'approved'

    return { success: true, newState, consistencyResult }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    }
  }
}

/**
 * Reject a pending action
 */
export function rejectAction(approvalId: string, reason?: string): boolean {
  const approval = pendingApprovals.find(a => a.id === approvalId)

  if (!approval || approval.status !== 'pending') {
    return false
  }

  approval.status = 'rejected'
  approval.reason = reason

  console.log(`Action rejected: ${approval.action.type} - ${reason || 'No reason provided'}`)

  return true
}

/**
 * Get all pending approvals
 */
export function getPendingApprovals(): PendingApproval[] {
  return pendingApprovals.filter(a => a.status === 'pending')
}

/**
 * Get approval by ID
 */
export function getApproval(approvalId: string): PendingApproval | undefined {
  return pendingApprovals.find(a => a.id === approvalId)
}

/**
 * Process auto-approvals that have timed out
 */
export async function processAutoApprovals(
  state: WritersRoomState
): Promise<{ processed: number; newState: WritersRoomState }> {
  let currentState = state
  let processed = 0
  const now = new Date()

  for (const approval of pendingApprovals) {
    if (
      approval.status === 'pending' &&
      approval.autoApproveAfter &&
      approval.autoApproveAfter <= now
    ) {
      const result = await approveAction(approval.id, currentState)
      if (result.success && result.newState) {
        currentState = result.newState
        approval.status = 'auto_approved'
        processed++
      }
    }
  }

  return { processed, newState: currentState }
}

/**
 * Clear old approvals from the queue
 */
export function clearOldApprovals(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAgeMs)
  const before = pendingApprovals.length

  const toKeep = pendingApprovals.filter(a => a.timestamp > cutoff || a.status === 'pending')

  pendingApprovals.length = 0
  pendingApprovals.push(...toKeep)

  return before - pendingApprovals.length
}

/**
 * Batch approval/rejection
 */
export interface BatchApprovalResult {
  approved: string[]
  rejected: string[]
  failed: { id: string; error: string }[]
}

export async function batchApproveActions(
  approvalIds: string[],
  state: WritersRoomState,
  options?: { projectId?: string; episodeId?: string }
): Promise<{
  result: BatchApprovalResult
  newState: WritersRoomState
  consistencyResults: ConsistencyCheckResult[]
}> {
  let currentState = state
  const consistencyResults: ConsistencyCheckResult[] = []
  const result: BatchApprovalResult = {
    approved: [],
    rejected: [],
    failed: [],
  }

  for (const id of approvalIds) {
    const approvalResult = await approveAction(id, currentState, options)

    if (approvalResult.success && approvalResult.newState) {
      result.approved.push(id)
      currentState = approvalResult.newState

      if (approvalResult.consistencyResult) {
        consistencyResults.push(approvalResult.consistencyResult)
      }
    } else {
      result.failed.push({ id, error: approvalResult.error || 'Unknown error' })
    }
  }

  return { result, newState: currentState, consistencyResults }
}

export function batchRejectActions(approvalIds: string[], reason?: string): BatchApprovalResult {
  const result: BatchApprovalResult = {
    approved: [],
    rejected: [],
    failed: [],
  }

  for (const id of approvalIds) {
    if (rejectAction(id, reason)) {
      result.rejected.push(id)
    } else {
      result.failed.push({ id, error: 'Could not reject' })
    }
  }

  return result
}

/**
 * Get approval statistics
 */
export function getApprovalStats(): {
  total: number
  pending: number
  approved: number
  rejected: number
  autoApproved: number
  byActionType: Record<string, number>
} {
  const stats = {
    total: pendingApprovals.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    autoApproved: 0,
    byActionType: {} as Record<string, number>,
  }

  for (const approval of pendingApprovals) {
    switch (approval.status) {
      case 'pending':
        stats.pending++
        break
      case 'approved':
        stats.approved++
        break
      case 'rejected':
        stats.rejected++
        break
      case 'auto_approved':
        stats.autoApproved++
        break
    }

    const actionType = approval.action.type
    stats.byActionType[actionType] = (stats.byActionType[actionType] || 0) + 1
  }

  return stats
}


