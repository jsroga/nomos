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
      details: 'Initializing...',
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
   * Start adaptive polling for task status
   */
  private startPolling(runState: MoodboardGenRunState, opId: string, onComplete?: () => void) {
    // Clear any existing polling for this run to avoid duplicates
    if (this.pollingIntervals.has(runState.runId)) {
      clearTimeout(this.pollingIntervals.get(runState.runId)!)
    }

    console.log(`📡 Starting moodboard status polling for run: ${runState.runId}`)

    let consecutiveErrors = 0
    let lastStatus = ''

    const poll = async () => {
      try {
        const statusResponse = await fetch(
          `/api/storyteller/moodboard/status?runId=${runState.runId}`
        )
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
          const elapsed = Date.now() - new Date(runState.startedAt).getTime()
          if (elapsed < 30000) {
            this.scheduleNextPoll(runState.runId, poll, 2000)
            return
          }
          console.warn('Moodboard generation run not found after grace period, clearing state')
          this.clearRunState(runState, opId)
          return
        }

        consecutiveErrors = 0
        const statusChanged = statusData.status !== lastStatus
        lastStatus = statusData.status

        // Extract detailed progress from metadata if available
        let statusDetail = `Status: ${statusData.status}`
        if (statusData.metadata) {
          const { stage, progress, provider } = statusData.metadata
          if (stage) {
            // Format stage (e.g. waiting_diffusion -> Waiting Diffusion)
            const formattedStage = stage
              .split('_')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
            statusDetail = `${formattedStage} (${progress}%)`
          }
        }

        useGlobalStatusStore.getState().updateOperation(opId, {
          details: statusDetail,
        })

        // Update polling interval based on stage
        // If waiting for diffusion (long poll), we can slow down a bit to save requests
        let nextInterval = statusChanged ? 2000 : POLLING_INTERVALS.SLOW
        if (statusData.metadata?.stage === 'waiting_diffusion') {
          nextInterval = 5000 // MJ generation takes time, poll slower
        }

        if (statusData.status === 'COMPLETED') {
          console.log('✅ Moodboard generation completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId, onComplete)
          return
        }

        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error('❌ Moodboard generation failed:', statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error('Status polling error:', error)
        consecutiveErrors++
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    poll()
  }

  private scheduleNextPoll(runId: string, pollFn: () => Promise<void>, interval: number) {
    const existingTimeout = this.pollingIntervals.get(runId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    const timeoutId = setTimeout(pollFn, interval)
    this.pollingIntervals.set(runId, timeoutId)
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
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
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
