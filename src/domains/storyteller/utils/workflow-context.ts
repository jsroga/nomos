import { AsyncLocalStorage } from 'node:async_hooks'
import { EventEmitter } from 'node:events'

export interface WorkflowContextState {
    traceId: string
    sessionId?: string
    userId?: string
    eventBus?: EventEmitter
}

// Global storage for the current request context
export const workflowContext = new AsyncLocalStorage<WorkflowContextState>()

// Helper to get the current event bus safely
export const getWorkflowEventBus = () => {
    return workflowContext.getStore()?.eventBus || null
}

// Helper to get current trace ID
export const getWorkflowTraceId = () => {
    return workflowContext.getStore()?.traceId
}

// Helper to get current session ID (for Langfuse session tracking)
export const getWorkflowSessionId = () => {
    return workflowContext.getStore()?.sessionId
}

// Helper to get current user ID
export const getWorkflowUserId = () => {
    return workflowContext.getStore()?.userId
}

// Constants for event names
export const WORKFLOW_EVENTS = {
    STEP_START: 'step_start',
    STEP_COMPLETE: 'step_complete',
    AGENT_THOUGHT: 'agent_thought',
    QUESTION_ASKED: 'question_asked',
    WORKFLOW_SUSPENDED: 'workflow_suspended',
    WORKFLOW_RESUMED: 'workflow_resumed',
}

// ============================================
// Suspended Workflow Storage (in-memory for now)
// In production, use Redis or database
// ============================================

export interface SuspendedWorkflow {
    runId: string
    stepId: string
    projectId: string
    traceId?: string
    suspendedAt: number
    suspendPayload: any
    resolveResume?: (data: any) => void
}

// Map of runId -> SuspendedWorkflow
const suspendedWorkflows = new Map<string, SuspendedWorkflow>()

export const workflowStore = {
    /**
     * Register a suspended workflow
     */
    suspend(data: Omit<SuspendedWorkflow, 'suspendedAt'>): void {
        suspendedWorkflows.set(data.runId, {
            ...data,
            suspendedAt: Date.now()
        })
        console.log(`[WorkflowStore] Suspended workflow ${data.runId} at step ${data.stepId}`)
    },

    /**
     * Get a suspended workflow
     */
    get(runId: string): SuspendedWorkflow | undefined {
        return suspendedWorkflows.get(runId)
    },

    /**
     * Resume a suspended workflow with user data
     */
    resume(runId: string, resumeData: { selectedOption: string; additionalFeedback?: string }): boolean {
        const suspended = suspendedWorkflows.get(runId)
        if (!suspended) {
            console.warn(`[WorkflowStore] No suspended workflow found for ${runId}`)
            return false
        }

        // If there's a resolve function waiting, call it
        if (suspended.resolveResume) {
            suspended.resolveResume(resumeData)
        }

        suspendedWorkflows.delete(runId)
        console.log(`[WorkflowStore] Resumed workflow ${runId} with option: ${resumeData.selectedOption}`)
        return true
    },

    /**
     * Clean up stale suspended workflows (older than 30 minutes)
     */
    cleanup(): void {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
        for (const [runId, workflow] of suspendedWorkflows) {
            if (workflow.suspendedAt < thirtyMinutesAgo) {
                suspendedWorkflows.delete(runId)
                console.log(`[WorkflowStore] Cleaned up stale workflow ${runId}`)
            }
        }
    },

    /**
     * List all suspended workflows (for debugging)
     */
    list(): SuspendedWorkflow[] {
        return Array.from(suspendedWorkflows.values())
    }
}
