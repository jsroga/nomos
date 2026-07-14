import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/shared/data/constants/polling'
import { ContentType } from '@/shared/data/constants/protocol'
import {
  PosterGenerationError,
  PosterGenerationLog,
  PosterGenerationType,
  PosterHttpMethod,
  PosterOperationDetail,
  PosterOperationLabel,
  PosterOperationStatus,
  PosterOperationTypeId,
  PosterPersistField,
  PosterStorageKeyPrefix,
  PosterTriggerStatus,
  PosterUnknownLabel,
} from '@/domains/storyteller/services/constants/poster-generation-service'

interface PosterGenRunState {
  runId: string
  projectId: string
  episodeId: string
  prompt: string
  startedAt: string
  type?: `${PosterGenerationType}`
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
    console.log(`${PosterGenerationLog.StoryboardStart}${episodeId}`)

    const opId = `${PosterStorageKeyPrefix.StoryboardGen}${episodeId}`

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: PosterOperationTypeId.StoryAgent,
      label: PosterOperationLabel.GeneratingStoryboard,
      details: PosterOperationDetail.CreatingVisualScript,
      status: PosterOperationStatus.InProgress,
    })

    try {
      const response = await fetch(`/api/storyteller/episodes/${episodeId}/generate-combined`, {
        method: PosterHttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          beats: beatsPayload,
          config,
        }),
      })

      const triggerData = await response.json()

      if (!response.ok || !triggerData.handleId) {
        throw new Error(triggerData.error || PosterGenerationError.StoryboardTriggerFailed)
      }

      const runState: PosterGenRunState = {
        runId: triggerData.handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: PosterGenerationType.Storyboard,
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(opId, JSON.stringify(runState))
      }

      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error(PosterGenerationLog.StoryboardError, error)
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
    console.log(`${PosterGenerationLog.PosterStart}${episodeId}`)

    const opId = `${PosterStorageKeyPrefix.PosterGen}${episodeId}`

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: PosterOperationTypeId.StoryAgent,
      label: PosterOperationLabel.GeneratingEpisodePoster,
      details: PosterOperationDetail.CreatingCinematicPoster,
      status: PosterOperationStatus.InProgress,
    })

    try {
      const response = await fetch(`/api/storyteller/episodes/${episodeId}/generate-poster`, {
        method: PosterHttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          prompt,
          config,
        }),
      })

      const triggerData = await response.json()

      if (!response.ok || !triggerData.handleId) {
        throw new Error(triggerData.error || PosterGenerationError.PosterTriggerFailed)
      }

      const runState: PosterGenRunState = {
        runId: triggerData.handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: PosterGenerationType.Poster,
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(opId, JSON.stringify(runState))
      }

      this.startPolling(runState, opId, onComplete)

      return triggerData.handleId
    } catch (error) {
      console.error(PosterGenerationLog.PosterError, error)
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
      `${PosterGenerationLog.PollingStart}${runState.runId} (${runState.type || PosterUnknownLabel.Unknown})`
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
            console.warn(PosterGenerationLog.RunNotFound)
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
          details: `${PosterOperationDetail.StatusPrefix}${statusData.status}`,
        })

        if (statusData.status === PosterTriggerStatus.Completed) {
          console.log(PosterGenerationLog.Completed, statusData.output)

          const imageUrl = statusData.output?.imageUrl
          if (imageUrl) {
            await this.handleCompletion(runState, imageUrl, opId, onComplete)
          } else {
            console.warn(PosterGenerationLog.NoImageUrl)
            this.clearRunState(runState, opId)
          }
          return
        }

        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error(PosterGenerationLog.Failed, statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }

        const nextInterval = statusChanged ? 2000 : POLLING_INTERVALS.SLOW
        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error(PosterGenerationLog.PollingError, error)
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
      console.log(PosterGenerationLog.Persisting)

      try {
        const payload =
          runState.type === PosterGenerationType.Storyboard
            ? { [PosterPersistField.StoryboardUrl]: imageUrl }
            : {
                [PosterPersistField.PosterUrl]: imageUrl,
                [PosterPersistField.PosterPrompt]: runState.prompt,
              }

        await fetch(`/api/storyteller/episodes/${runState.episodeId}`, {
          method: PosterHttpMethod.Patch,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(payload),
        })
        console.log(
          runState.type === PosterGenerationType.Storyboard
            ? PosterGenerationLog.PersistedStoryboard
            : PosterGenerationLog.PersistedPoster
        )
      } catch (dbErr) {
        console.error(
          `${PosterGenerationLog.PersistFailed}${runState.type} URL:`,
          dbErr
        )
      }

      if (onComplete) {
        onComplete(imageUrl)
      }
    } catch (error) {
      console.error(PosterGenerationLog.CompletionError, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: PosterGenRunState, opId: string) {
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(opId)
    }

    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending poster generation tasks from localStorage (call on app load or component mount)
   */
  resumePendingGenerations(
    projectId: string,
    onComplete?: (url: string, episodeId: string, type?: `${PosterGenerationType}`) => void
  ) {
    if (typeof window === 'undefined') return

    const prefix = PosterStorageKeyPrefix.PosterGen

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue

          const runState: PosterGenRunState = JSON.parse(data)
          if (runState.projectId !== projectId) continue

          if (runState.runId) {
            console.log(PosterGenerationLog.ResumingPolling, runState.runId)

            const label =
              runState.type === PosterGenerationType.Poster
                ? PosterOperationLabel.GeneratingEpisodePosterResumed
                : PosterOperationLabel.GeneratingStoryboardResumed

            useGlobalStatusStore.getState().addOperation({
              id: key,
              type: PosterOperationTypeId.StoryAgent,
              label: label,
              details: PosterOperationDetail.ResumingGeneration,
              status: PosterOperationStatus.InProgress,
            })

            const completionHandler = onComplete
              ? (url: string) => onComplete(url, runState.episodeId, runState.type)
              : undefined
            this.startPolling(runState, key, completionHandler)
          }
        } catch (_e) {
          console.warn(PosterGenerationLog.ParseStateFailed, key)
        }
      }
    }
  }
}

export const posterGenerationService = new PosterGenerationService()
