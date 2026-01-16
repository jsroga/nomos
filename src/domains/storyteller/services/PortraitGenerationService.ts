/* eslint-disable @typescript-eslint/no-unused-vars */
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

// Define local storage keys - using characterId for reliable tracking
const DynamicLocalStorageKeys = {
  portraitGen: (characterId: string) => `portrait-gen-${characterId}`,
}

interface PortraitGenRunState {
  runId: string
  projectId: string
  characterId: string
  characterName: string
  startedAt: string
}

export class PortraitGenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Generate portrait using Trigger.dev background task
   * @param characterId The character's database ID for tracking and DB updates
   * @param characterName Used for UI display in the status widget
   * @param params Generation parameters
   * @param onComplete Callback with the generated image URL
   */
  async generate(
    characterId: string,
    characterName: string,
    params: {
      prompt: string
      projectId: string
      apiKey: string
    },
    onComplete?: (imageUrl: string) => void
  ): Promise<string | null> {
    console.log(
      `Starting portrait generation via Trigger.dev for character ${characterId} (${characterName})`
    )

    // Use characterId as the stable key for localStorage and operations
    const storageKey = DynamicLocalStorageKeys.portraitGen(characterId)
    const opId = storageKey // Use same key for operation ID for consistency

    // Check if already generating for this character
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem(storageKey)
      if (existing) {
        console.warn(`Portrait generation already in progress for character ${characterId}`)
        return null
      }
    }

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'portrait-gen',
      label: `Generating Portrait: ${characterName}`,
      details: 'Submitting task...',
      status: 'pending',
    })

    try {
      // Trigger the generation task
      const triggerResponse = await fetch('/api/storyteller/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          characterId,
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok) {
        useGlobalStatusStore.getState().removeOperation(opId)
        throw new Error(triggerData.error || 'Failed to trigger portrait generation')
      }

      if (!triggerData.handleId) {
        useGlobalStatusStore.getState().removeOperation(opId)
        throw new Error('No handle ID returned from trigger')
      }

      console.log('Portrait generation task triggered:', triggerData.handleId)

      // Update status to in-progress
      useGlobalStatusStore.getState().updateOperation(opId, {
        status: 'in-progress',
        details: 'Generating image...',
      })

      // Save run state to localStorage for recovery
      const runState: PortraitGenRunState = {
        runId: triggerData.handleId,
        projectId: params.projectId,
        characterId,
        characterName,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(runState))
      }

      // Start polling for status
      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error('Portrait generation error:', error)
      useGlobalStatusStore.getState().updateOperation(opId, {
        status: 'failed',
        details: 'Generation failed',
      })
      setTimeout(() => useGlobalStatusStore.getState().removeOperation(opId), 5000)
      throw error
    }
  }

  /**
   * Check if generation is in progress for a specific character
   */
  isGenerating(characterId: string): boolean {
    if (typeof window === 'undefined') return false
    const storageKey = DynamicLocalStorageKeys.portraitGen(characterId)
    return localStorage.getItem(storageKey) !== null
  }

  /**
   * Resume any pending portrait generation tasks from localStorage (call on app load or component mount)
   */
  resumePendingGenerations(onComplete?: (characterId: string, imageUrl: string) => void) {
    if (typeof window === 'undefined') return

    // Scan all local storage keys for portrait generation
    const prefix = 'portrait-gen-'

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue

          const runState: PortraitGenRunState = JSON.parse(data)
          if (runState.runId && runState.characterId) {
            console.log(
              'Resuming portrait generation polling for:',
              runState.runId,
              runState.characterName
            )

            const opId = key // key is the opId

            // Re-add status indicators
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: 'portrait-gen',
              label: `Generating Portrait: ${runState.characterName} (resumed)`,
              details: 'Checking status...',
              status: 'in-progress',
            })

            // Start polling with wrapper for onComplete
            this.startPolling(
              runState,
              opId,
              onComplete ? url => onComplete(runState.characterId, url) : undefined
            )
          }
        } catch (e) {
          console.warn('Failed to parse portrait generation run state:', key, e)
          // Clean up invalid entry
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Start adaptive polling for task status
   */
  private startPolling(
    runState: PortraitGenRunState,
    opId: string,
    onComplete?: (url: string) => void
  ) {
    // Clear any existing polling for this run
    if (this.pollingIntervals.has(runState.runId)) {
      clearTimeout(this.pollingIntervals.get(runState.runId)!)
    }

    let consecutiveErrors = 0
    let lastStatus = ''

    const poll = async () => {
      try {
        const statusResponse = await fetch(
          `/api/storyteller/generate-portrait/status?runId=${runState.runId}`
        )

        if (statusResponse.status === 404) {
          consecutiveErrors++
          if (consecutiveErrors > 10) {
            console.warn('Run not found, cleaning up')
            this.finish(runState, opId, false)
            return
          }
          this.scheduleNextPoll(runState.runId, poll, 2000)
          return
        }

        consecutiveErrors = 0
        const statusData = await statusResponse.json()
        const statusChanged = statusData.status !== lastStatus
        lastStatus = statusData.status

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          if (statusData.output && statusData.output.success) {
            const imageUrl = statusData.output.localPath || statusData.output.imageUrl
            console.log('Portrait completed:', imageUrl)

            // Dispatch completion event for UI refresh
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('portrait-generation-complete', {
                  detail: {
                    characterId: runState.characterId,
                    portraitUrl: imageUrl,
                    projectId: runState.projectId,
                  },
                })
              )
            }

            if (onComplete) {
              onComplete(imageUrl)
            }

            this.finish(runState, opId, true)
          } else {
            useGlobalStatusStore.getState().updateOperation(opId, {
              status: 'failed',
              details: 'Generation returned error',
            })
            this.finish(runState, opId, false)
          }
          return
        }

        // Check if failed
        if (
          statusData.status === 'FAILED' ||
          statusData.status === 'CANCELED' ||
          statusData.status === 'TIMED_OUT' ||
          statusData.status === 'CRASHED' ||
          statusData.status === 'SYSTEM_FAILURE'
        ) {
          useGlobalStatusStore.getState().updateOperation(opId, {
            status: 'failed',
            details: `Task ${statusData.status.toLowerCase()}`,
          })
          this.finish(runState, opId, false)
          return
        }

        // Still running - adaptive polling
        const nextInterval = statusChanged ? 2000 : POLLING_INTERVALS.SLOW
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

  private finish(runState: PortraitGenRunState, opId: string, success: boolean) {
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    const storageKey = DynamicLocalStorageKeys.portraitGen(runState.characterId)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }

    // Remove operation from status store after delay
    setTimeout(
      () => {
        useGlobalStatusStore.getState().removeOperation(opId)
      },
      success ? 2000 : 5000
    )
  }
}

export const portraitGenerationService = new PortraitGenerationService()
