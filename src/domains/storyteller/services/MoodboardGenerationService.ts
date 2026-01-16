/* eslint-disable @typescript-eslint/no-unused-vars */
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

// Define local storage keys
const DynamicLocalStorageKeys = {
  moodboardGen: (projectId: string, index?: number) =>
    `moodboard-gen-${projectId}${index !== undefined ? `-${index}` : ''}`,
}

interface MoodboardGenRunState {
  runId: string
  projectId: string
  prompts: string[]
  startedAt: string
  promptIndex?: number // Save index in state
}

export class MoodboardGenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Generate moodboard using Trigger.dev background task
   */
  async generate(
    projectId: string,
    prompts: string[],
    styleReference: string | undefined,
    providerConfig: any,
    onComplete?: () => void,
    promptIndex?: number // NEW: Optional prompt index for single generation
  ): Promise<string | null> {
    console.log(`Starting moodboard generation via Trigger.dev for project ${projectId}`)

    // Create a unique ID for this operation
    const opId = DynamicLocalStorageKeys.moodboardGen(projectId, promptIndex)

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'story-agent',
      label: promptIndex !== undefined ? 'Regenerating Image' : 'Generating Moodboard',
      details: `Project: ${projectId}`,
      status: 'in-progress',
    })

    try {
      // Trigger the moodboard generation task
      const triggerResponse = await fetch('/api/storyteller/moodboard/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompts,
          styleReference,
          providerConfig,
          promptIndex, // Pass it to the backend
        }),
      })

      const triggerData = await triggerResponse.json()

      // The trigger route returns { success: true, handleId: "..." }
      if (!triggerResponse.ok || !triggerData.handleId) {
        throw new Error(triggerData.error || 'Failed to trigger moodboard generation task')
      }

      console.log('Moodboard generation task triggered:', triggerData.handleId)

      // Save run state to localStorage for recovery
      const runState: MoodboardGenRunState = {
        runId: triggerData.handleId,
        projectId,
        prompts,
        startedAt: new Date().toISOString(),
        promptIndex,
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(opId, JSON.stringify(runState))
      }

      // Start polling for status
      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error('Moodboard generation error:', error)
      // Clean up status on error
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start polling for task status
   */
  private startPolling(runState: MoodboardGenRunState, opId: string, onComplete?: () => void) {
    // Clear any existing polling for this run to avoid duplicates
    if (this.pollingIntervals.has(runState.runId)) {
      clearInterval(this.pollingIntervals.get(runState.runId)!)
    }

    console.log(`📡 Starting moodboard status polling for run: ${runState.runId}`)

    const pollInterval = setInterval(async () => {
      try {
        console.log(`📡 Polling moodboard status: ${runState.runId}`)
        const statusResponse = await fetch(
          `/api/storyteller/moodboard/status?runId=${runState.runId}`
        )
        const statusData = await statusResponse.json()
        console.log('📡 Moodboard status response:', statusData.status)

        if (statusResponse.status === 404) {
          const elapsed = Date.now() - new Date(runState.startedAt).getTime()
          if (elapsed < 30000) {
            console.warn(`Moodboard run not found yet (elapsed ${elapsed}ms), retrying...`)
            return
          }
          console.warn('Moodboard generation run not found after grace period, clearing state')
          this.clearRunState(runState, opId)
          return
        }

        // Update operation with current status
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `Status: ${statusData.status}`,
        })

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          console.log('✅ Moodboard generation completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId, onComplete)
          return
        }

        // Check if failed
        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error('❌ Moodboard generation failed:', statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, POLLING_INTERVALS.DEFAULT) // Poll every 5 seconds

    this.pollingIntervals.set(runState.runId, pollInterval)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: MoodboardGenRunState,
    output: { success: boolean; images: string[] },
    opId: string,
    onComplete?: () => void
  ) {
    try {
      if (output?.success) {
        console.log('Moodboard generated successfully')

        // Dispatch custom event to notify UI to refresh data
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('moodboard-generation-complete', {
              detail: {
                projectId: runState.projectId,
                promptIndex: runState.promptIndex,
                images: output.images,
              },
            })
          )
        }

        if (onComplete) {
          onComplete()
        }
      }
    } catch (error) {
      console.error('Error handling moodboard completion:', error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: MoodboardGenRunState, opId: string) {
    // Stop polling
    const interval = this.pollingIntervals.get(runState.runId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(runState.runId)
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(opId)
    }

    // Clear UI status
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending moodboard generation tasks from localStorage (call on app load or component mount)
   */
  resumePendingGenerations(projectId: string, onComplete?: () => void) {
    if (typeof window === 'undefined') return

    // Scan all local storage keys for this project's moodboard generations
    const prefix = `moodboard-gen-${projectId}`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue

          const runState: MoodboardGenRunState = JSON.parse(data)
          if (runState.runId) {
            console.log('Resuming moodboard generation polling for:', runState.runId)

            // Re-add status indicators
            useGlobalStatusStore.getState().addOperation({
              id: key, // key is the opId logic now
              type: 'story-agent',
              label:
                runState.promptIndex !== undefined
                  ? 'Regenerating Image (resumed)'
                  : 'Generating Moodboard (resumed)',
              details: `Project: ${projectId}`,
              status: 'in-progress',
            })

            // Start polling
            this.startPolling(runState, key, onComplete)
          }
        } catch (e) {
          console.warn('Failed to parse moodboard generation run state:', key)
        }
      }
    }
  }
}

export const moodboardGenerationService = new MoodboardGenerationService()
