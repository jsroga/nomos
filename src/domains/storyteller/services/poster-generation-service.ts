import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  waitForTriggerRun,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
import { readTriggerRunOutputField } from '@/shared/data/polling/trigger-run-polling'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'
import {
  fetchPosterRunStatus,
  triggerCombinedStoryboard,
  triggerEpisodePoster,
} from '@/domains/storyteller/core/io/poster.api'
import {
  PosterGenerationError,
  PosterGenerationLog,
  PosterGenerationType,
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

/** Parse a persisted poster run-state blob from browser storage without `as` casts. */
function posterRunStateFromJson(raw: string): PosterGenRunState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const rec = recordFromJson(parsed)
  const runId = readString(rec.runId)
  if (!runId) return null
  const typeValue = readString(rec.type)
  return {
    runId,
    projectId: readString(rec.projectId) ?? '',
    episodeId: readString(rec.episodeId) ?? '',
    prompt: readString(rec.prompt) ?? '',
    startedAt: readString(rec.startedAt) ?? '',
    type: Object.values(PosterGenerationType).find(t => t === typeValue),
  }
}

export class PosterGenerationService {
  async generateStoryboard(
    projectId: string,
    episodeId: string,
    prompt: string,
    beatsPayload: Record<string, unknown>[],
    config: Record<string, unknown>,
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
      const { handleId, error } = await triggerCombinedStoryboard(episodeId, {
        beats: beatsPayload,
        config,
      })

      if (!handleId) {
        throw new Error(error || PosterGenerationError.StoryboardTriggerFailed)
      }

      const runState: PosterGenRunState = {
        runId: handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: PosterGenerationType.Storyboard,
      }

      browserStorage.setObject(opId, runState)
      void this.pollRun(runState, opId, onComplete)

      return handleId
    } catch (error) {
      console.error(PosterGenerationLog.StoryboardError, error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  async generatePoster(
    projectId: string,
    episodeId: string,
    prompt: string,
    config: Record<string, unknown>,
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
      const { handleId, error } = await triggerEpisodePoster(episodeId, { prompt, config })

      if (!handleId) {
        throw new Error(error || PosterGenerationError.PosterTriggerFailed)
      }

      const runState: PosterGenRunState = {
        runId: handleId,
        projectId,
        episodeId,
        prompt,
        startedAt: new Date().toISOString(),
        type: PosterGenerationType.Poster,
      }

      browserStorage.setObject(opId, runState)
      void this.pollRun(runState, opId, onComplete)

      return handleId
    } catch (error) {
      console.error(PosterGenerationLog.PosterError, error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  private async pollRun(
    runState: PosterGenRunState,
    opId: string,
    onComplete?: (url: string) => void
  ): Promise<void> {
    console.log(
      `${PosterGenerationLog.PollingStart}${runState.runId} (${runState.type || PosterUnknownLabel.Unknown})`
    )

    try {
      const result = await waitForTriggerRun(() => fetchPosterRunStatus(runState.runId), {
        intervalMs: POLLING_INTERVALS.SLOW,
        maxPolls: 120,
        onPoll: data => {
          useGlobalStatusStore.getState().updateOperation(opId, {
            details: `${PosterOperationDetail.StatusPrefix}${data.status ?? 'unknown'}`,
          })
        },
      })

      if (result.status === PosterTriggerStatus.Completed) {
        const imageUrl = readTriggerRunOutputField(result, 'imageUrl')
        if (imageUrl) {
          await this.handleCompletion(runState, imageUrl, opId, onComplete)
          return
        }
        console.warn(PosterGenerationLog.NoImageUrl)
      } else {
        console.error(PosterGenerationLog.Failed, result.error || result.status)
      }

      this.clearRunState(runState, opId)
    } catch (error) {
      if (error instanceof TriggerRunPollFailedError) {
        console.error(PosterGenerationLog.Failed, error.runError || error.status)
      } else {
        console.error(PosterGenerationLog.PollingError, error)
      }
      this.clearRunState(runState, opId)
    }
  }

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

        await patchStorytellerEpisode(runState.episodeId, payload)
        console.log(
          runState.type === PosterGenerationType.Storyboard
            ? PosterGenerationLog.PersistedStoryboard
            : PosterGenerationLog.PersistedPoster
        )
      } catch (dbErr) {
        console.error(`${PosterGenerationLog.PersistFailed}${runState.type} URL:`, dbErr)
      }

      onComplete?.(imageUrl)
    } catch (error) {
      console.error(PosterGenerationLog.CompletionError, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  private clearRunState(_runState: PosterGenRunState, opId: string) {
    browserStorage.remove(opId)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  resumePendingGenerations(
    projectId: string,
    onComplete?: (url: string, episodeId: string, type?: `${PosterGenerationType}`) => void
  ) {
    if (typeof window === 'undefined') return

    browserStorage.forEachPrefixed(PosterStorageKeyPrefix.PosterGen, (key, raw) => {
      try {
        const runState = posterRunStateFromJson(raw)
        if (!runState || runState.projectId !== projectId) return

        console.log(PosterGenerationLog.ResumingPolling, runState.runId)

        const label =
          runState.type === PosterGenerationType.Poster
            ? PosterOperationLabel.GeneratingEpisodePosterResumed
            : PosterOperationLabel.GeneratingStoryboardResumed

        useGlobalStatusStore.getState().addOperation({
          id: key,
          type: PosterOperationTypeId.StoryAgent,
          label,
          details: PosterOperationDetail.ResumingGeneration,
          status: PosterOperationStatus.InProgress,
        })

        const completionHandler = onComplete
          ? (url: string) => onComplete(url, runState.episodeId, runState.type)
          : undefined

        void this.pollRun(runState, key, completionHandler)
      } catch {
        console.warn(PosterGenerationLog.ParseStateFailed, key)
      }
    })
  }
}

export const posterGenerationService = new PosterGenerationService()
