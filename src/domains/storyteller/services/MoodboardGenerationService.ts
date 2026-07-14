import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/shared/data/constants/polling'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  MoodboardGenerationError,
  MoodboardGenerationLog,
  MoodboardHttpMethod,
  MoodboardOperationDetail,
  MoodboardOperationLabel,
  MoodboardOperationStatus,
  MoodboardOperationType,
  MoodboardStorageKey,
  MoodboardTriggerStage,
  MoodboardTriggerStatus,
} from '@/domains/storyteller/services/constants/moodboard-generation-service'

// Define local storage keys
const DynamicLocalStorageKeys = {
  moodboardGen: (projectId: string, index?: number) =>
    `${MoodboardStorageKey.GenPrefix}${projectId}${index !== undefined ? `-${index}` : ''}`,
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
      type: MoodboardOperationType.StoryAgent,
      label:
        promptIndex !== undefined
          ? MoodboardOperationLabel.Regenerating
          : MoodboardOperationLabel.Generating,
      details: MoodboardOperationDetail.Initializing,
      status: MoodboardOperationStatus.InProgress,
    })

    try {
      // Trigger the moodboard generation task
      const triggerResponse = await fetch('/api/storyteller/moodboard/trigger', {
        method: MoodboardHttpMethod.Post,
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
        throw new Error(triggerData.error || MoodboardGenerationError.TriggerFailed)
      }

      console.log(MoodboardGenerationLog.TaskTriggered, triggerData.handleId)

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
      console.error(MoodboardGenerationLog.GenerationError, error)
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
          console.warn(MoodboardGenerationLog.RunNotFound)
          this.clearRunState(runState, opId)
          return
        }

        consecutiveErrors = 0
        const statusChanged = statusData.status !== lastStatus
        lastStatus = statusData.status

        // Extract detailed progress from metadata if available
        let statusDetail = `Status: ${statusData.status}`
        const progressVal =
          typeof statusData.metadata?.progress === 'number' ? statusData.metadata.progress : 0
        if (statusData.metadata) {
          const { stage } = statusData.metadata
          if (stage) {
            // Format stage (e.g. waiting_diffusion -> Waiting Diffusion)
            const formattedStage = stage
              .split('_')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
            statusDetail = `${formattedStage} (${progressVal}%)`
          } else {
            statusDetail = `${statusDetail} (${progressVal}%)`
          }
        }

        useGlobalStatusStore.getState().updateOperation(opId, {
          details: statusDetail,
        })

        // Poll frequently enough so user sees progress (every 3s when running)
        let nextInterval = statusChanged ? 2000 : POLLING_INTERVALS.FAST
        if (statusData.metadata?.stage === MoodboardTriggerStage.WaitingDiffusion) {
          nextInterval = 4000 // MJ diffusion poll; still show progress regularly
        }

        if (statusData.status === MoodboardTriggerStatus.Completed) {
          console.log(MoodboardGenerationLog.Completed, statusData.output)
          await this.handleCompletion(runState, statusData.output, opId, onComplete)
          return
        }

        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error(MoodboardGenerationLog.Failed, statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error(MoodboardGenerationLog.PollingError, error)
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
        console.log(MoodboardGenerationLog.GeneratedSuccessfully)

        // Notify UI to refresh moodboard data
        if (typeof window !== 'undefined') {
          getStorytellerUiStore().notifyMoodboardComplete({
            projectId: runState.projectId,
            promptIndex: runState.promptIndex,
            images: output.images,
          })
        }

        if (onComplete) {
          onComplete()
        }
      }
    } catch (error) {
      console.error(MoodboardGenerationLog.CompletionError, error)
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
    const prefix = MoodboardStorageKey.GenPrefix + projectId

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue

          const runState: MoodboardGenRunState = JSON.parse(data)
          if (runState.runId) {
            console.log(MoodboardGenerationLog.ResumingPolling, runState.runId)

            // Re-add status indicators
            useGlobalStatusStore.getState().addOperation({
              id: key, // key is the opId logic now
              type: MoodboardOperationType.StoryAgent,
              label:
                runState.promptIndex !== undefined
                  ? MoodboardOperationLabel.RegeneratingResumed
                  : MoodboardOperationLabel.GeneratingResumed,
              details: `${MoodboardOperationDetail.ProjectPrefix}${projectId}`,
              status: MoodboardOperationStatus.InProgress,
            })

            // Start polling
            this.startPolling(runState, key, onComplete)
          }
        } catch (_e) {
          console.warn(MoodboardGenerationLog.ParseStateFailed, key)
        }
      }
    }
  }
}

export const moodboardGenerationService = new MoodboardGenerationService()
