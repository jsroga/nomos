import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

// Define local storage keys

interface PosterGenRunState {
  runId: string
  projectId: string
  episodeId: string
  prompt: string
  startedAt: string
  type?: 'poster' | 'storyboard'
}

export class PosterGenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Generate storyboard/poster using Trigger.dev background task
   */
  /**
   * Generate storyboard (COMBINED wireframe) using Trigger.dev (Gemini)
   */
  async generateStoryboard(
    projectId: string,
    episodeId: string,
    prompt: string,
    beatsPayload: any[],
    config: any,
    onComplete?: (url: string) => void
  ): Promise<string | null> {
    console.log(`Starting storyboard generation for episode ${episodeId}`)

    const opId = `storyboard-gen-${episodeId}`

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'story-agent',
      label: 'Generating Storyboard',
      details: 'Creating visual script...',
      status: 'in-progress',
    })

    try {
      const response = await fetch(`/api/storyteller/episodes/${episodeId}/generate-combined`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beats: beatsPayload,
          config,
        }),
      })

      const triggerData = await response.json()

      if (!response.ok || !triggerData.handleId) {
        throw new Error(triggerData.error || 'Failed to trigger storyboard generation task')
      }

      const runState: PosterGenRunState = {
        runId: triggerData.handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: 'storyboard',
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(opId, JSON.stringify(runState))
      }

      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error('Storyboard generation error:', error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Generate cinematic POSTER using Trigger.dev (Midjourney)
   */
  async generatePoster(
    projectId: string,
    episodeId: string,
    prompt: string,
    config: any,
    onComplete?: (url: string) => void
  ): Promise<string | null> {
    console.log(`Starting poster generation for episode ${episodeId}`)

    const opId = `poster-gen-${episodeId}`

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'story-agent', // or 'portrait-gen' equivalent
      label: 'Generating Episode Poster',
      details: 'Creating cinematic poster via Midjourney...',
      status: 'in-progress',
    })

    try {
      const response = await fetch(`/api/storyteller/episodes/${episodeId}/generate-poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          config,
        }),
      })

      const triggerData = await response.json()

      if (!response.ok || !triggerData.handleId) {
        throw new Error(triggerData.error || 'Failed to trigger poster generation task')
      }

      const runState: PosterGenRunState = {
        runId: triggerData.handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: 'poster',
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(opId, JSON.stringify(runState))
      }

      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error('Poster generation error:', error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   */
  private startPolling(
    runState: PosterGenRunState,
    opId: string,
    onComplete?: (url: string) => void
  ) {
    if (this.pollingIntervals.has(runState.runId)) {
      clearTimeout(this.pollingIntervals.get(runState.runId)!)
    }

    console.log(
      `📡 Starting status polling for run: ${runState.runId} (${runState.type || 'unknown'})`
    )

    let consecutiveErrors = 0
    let lastStatus = ''

    const poll = async () => {
      try {
        const statusResponse = await fetch(
          `/api/storyteller/episodes/poster/status?runId=${runState.runId}`
        )
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
          consecutiveErrors++
          if (consecutiveErrors > 10) {
            console.warn('Poster generation run not found, clearing state')
            this.clearRunState(runState, opId)
            return
          }
          this.scheduleNextPoll(runState.runId, poll, 2000)
          return
        }

        consecutiveErrors = 0
        const statusChanged = statusData.status !== lastStatus
        lastStatus = statusData.status

        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `Status: ${statusData.status}`,
        })

        if (statusData.status === 'COMPLETED') {
          console.log('✅ Poster generation completed:', statusData.output)

          const imageUrl = statusData.output?.imageUrl
          if (imageUrl) {
            await this.handleCompletion(runState, imageUrl, opId, onComplete)
          } else {
            console.warn('Completed but no image URL found')
            this.clearRunState(runState, opId)
          }
          return
        }

        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error('❌ Poster generation failed:', statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }

        // Adaptive polling
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

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: PosterGenRunState,
    imageUrl: string,
    opId: string,
    onComplete?: (url: string) => void
  ) {
    try {
      console.log('Poster generated successfully, persisting to DB...')

      // 1. Persist to Database immediately
      try {
        const payload =
          runState.type === 'storyboard'
            ? { storyboardUrl: imageUrl }
            : { posterUrl: imageUrl, posterPrompt: runState.prompt }

        await fetch(`/api/storyteller/episodes/${runState.episodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        console.log(
          `✅ ${runState.type === 'storyboard' ? 'Storyboard' : 'Poster'} URL persisted to DB`
        )
      } catch (dbErr) {
        console.error(`❌ Failed to persist ${runState.type} URL:`, dbErr)
      }

      // Dispatch custom event to notify UI (optional, if components need it)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('poster-generation-complete', {
            detail: {
              episodeId: runState.episodeId,
              imageUrl: imageUrl,
              prompt: runState.prompt,
            },
          })
        )
      }

      if (onComplete) {
        onComplete(imageUrl)
      }
    } catch (error) {
      console.error('Error handling poster completion:', error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: PosterGenRunState, opId: string) {
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
   * Resume any pending poster generation tasks from localStorage (call on app load or component mount)
   */
  resumePendingGenerations(
    projectId: string,
    onComplete?: (url: string, episodeId: string, type?: 'poster' | 'storyboard') => void
  ) {
    if (typeof window === 'undefined') return

    // Scan all local storage keys - simplified for now since we use poster-gen-episodeId
    // We iterate through all keys to find relevant ones
    const prefix = 'poster-gen-'

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue

          const runState: PosterGenRunState = JSON.parse(data)
          // Basic check to see if this belongs to project/episode context - tricky if we don't store project ID in LS key
          // But we store it in runState
          if (runState.projectId !== projectId) continue

          if (runState.runId) {
            console.log('Resuming poster generation polling for:', runState.runId)

            const label =
              runState.type === 'poster'
                ? 'Generating Episode Poster (resumed)'
                : 'Generating Storyboard (resumed)'

            // Re-add status indicators
            useGlobalStatusStore.getState().addOperation({
              id: key, // key is the opId
              type: 'story-agent',
              label: label,
              details: 'Resuming generation...',
              status: 'in-progress',
            })

            // Start polling
            // Wrap onComplete to match signature if needed
            const completionHandler = onComplete
              ? (url: string) => onComplete(url, runState.episodeId, runState.type)
              : undefined
            this.startPolling(runState, key, completionHandler)
          }
        } catch (_e) {
          console.warn('Failed to parse poster generation run state:', key)
        }
      }
    }
  }
}

export const posterGenerationService = new PosterGenerationService()
