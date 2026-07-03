/**
 * Undo Manager
 *
 * Manages undo/redo stack for consistency fixes.
 * Allows users to revert auto-applied fixes.
 */

import { UndoAction, AppliedFix, ConsistencyFix } from '@/domains/storyteller/core/types/ConsistencyTypes'
import { revertFix } from '@/domains/storyteller/core/editing/CascadeEditor'

/**
 * Undo Manager class
 */
export class UndoManager {
  private undoStack: UndoAction[] = []
  private maxStackSize: number = 50

  /**
   * Record a consistency fix for potential undo
   */
  recordConsistencyFix(fixes: ConsistencyFix[], appliedFixes: AppliedFix[]): string {
    const action: UndoAction = {
      id: `undo-${Date.now()}`,
      type: 'consistency_fix',
      fixes,
      appliedFixes,
      timestamp: Date.now(),
    }

    this.undoStack.push(action)

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    return action.id
  }

  /**
   * Undo the most recent consistency fix
   */
  async undo(projectId: string, episodeId?: string): Promise<UndoAction | null> {
    const action = this.undoStack.pop()

    if (!action) {
      console.warn('[Undo Manager] No actions to undo')
      return null
    }

    console.log(`[Undo Manager] Undoing action ${action.id}`)

    // Revert all applied fixes in reverse order
    const reversedFixes = [...action.appliedFixes].reverse()

    for (const fix of reversedFixes) {
      if (fix.applied) {
        try {
          await revertFix(fix, projectId, episodeId)
        } catch (error) {
          console.error(`[Undo Manager] Failed to revert fix ${fix.id}:`, error)
          // Continue with other fixes even if one fails
        }
      }
    }

    return action
  }

  /**
   * Undo a specific consistency fix by ID
   */
  async undoById(
    actionId: string,
    projectId: string,
    episodeId?: string
  ): Promise<UndoAction | null> {
    const actionIndex = this.undoStack.findIndex(a => a.id === actionId)

    if (actionIndex === -1) {
      console.warn(`[Undo Manager] Action ${actionId} not found`)
      return null
    }

    const action = this.undoStack[actionIndex]

    // Remove from stack
    this.undoStack.splice(actionIndex, 1)

    console.log(`[Undo Manager] Undoing action ${actionId}`)

    // Revert all applied fixes in reverse order
    const reversedFixes = [...action.appliedFixes].reverse()

    for (const fix of reversedFixes) {
      if (fix.applied) {
        try {
          await revertFix(fix, projectId, episodeId)
        } catch (error) {
          console.error(`[Undo Manager] Failed to revert fix ${fix.id}:`, error)
        }
      }
    }

    return action
  }

  /**
   * Get the most recent undo action
   */
  peekLastAction(): UndoAction | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null
  }

  /**
   * Get all undo actions
   */
  getAllActions(): UndoAction[] {
    return [...this.undoStack]
  }

  /**
   * Clear the undo stack
   */
  clear(): void {
    this.undoStack = []
  }

  /**
   * Get the size of the undo stack
   */
  getStackSize(): number {
    return this.undoStack.length
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }
}

// Global singleton instance
let globalUndoManager: UndoManager | null = null

/**
 * Get the global undo manager instance
 */
export function getUndoManager(): UndoManager {
  if (!globalUndoManager) {
    globalUndoManager = new UndoManager()
  }
  return globalUndoManager
}
