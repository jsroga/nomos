import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  waitForTriggerRun,
  TriggerRunPollAbortedError,
  TriggerRunPollFailedError,
  TriggerRunPollTimeoutError,
  type TriggerRunStatusPayload,
} from '@/shared/data/polling/wait-for-trigger-run'
import { readTriggerRunOutputField } from '@/shared/data/polling/trigger-run-polling'
import {
  fetchStorytellerEpisode,
  patchStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import {
  fetchPosterRunStatus,
  triggerCombinedStoryboard,
  triggerEpisodePoster,
} from '@/domains/storyteller/core/io/poster.api'
import type { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import type { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
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
  PosterUnknownLabel,
  POSTER_RUN_MAX_POLLS,
  STORYBOARD_VIDEO_MAX_POLLS,
} from '@/domains/storyteller/services/constants/poster-generation-service'
import { isNewerPosterUrl, preferLatestPosterUrl, readEpisodePosterUrl } from '@/domains/storyteller/services/poster-url-from-episode'
import {
  failPosterRun,
  resumePendingPosterGenerations,
  type PosterGenCallbacks,
  type PosterGenRunState,
  type PosterResumeHost,
} from '@/domains/storyteller/services/poster-generation-resume'

export {
  isNewerPosterUrl,
  readEpisodePosterUrl,
  shouldSettleStoredPosterRun,
} from '@/domains/storyteller/services/poster-url-from-episode'

const POSTER_UNKNOWN_STATUS = 'unknown'
const POSTER_IMAGE_URL_FIELD = 'imageUrl'
const POSTER_IS_VARIANT_GRID_FIELD = 'isVariantGrid'

export class PosterGenerationService {
  /** project-scope: none — browser-side; the API route it calls mints the scope. */
  async generateStoryboard(
    projectId: string,
    episodeId: string,
    prompt: string,
    onComplete?: (url: string, meta?: { isVariantGrid: boolean }) => void,
    onError?: (error: unknown) => void,
    model?: ApiframeVideoModel,
    look?: StoryboardVideoLook,
  ): Promise<string | null> {
    console.log(`${PosterGenerationLog.StoryboardStart}${episodeId}`)

    const opId = `${PosterStorageKeyPrefix.StoryboardGen}${episodeId}`
    const callbacks: PosterGenCallbacks = { onComplete, onError }

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: PosterOperationTypeId.StoryAgent,
      label: PosterOperationLabel.GeneratingStoryboard,
      details: PosterOperationDetail.CreatingVisualScript,
      status: PosterOperationStatus.InProgress,
    })

    try {
      const { handleId, error } = await triggerCombinedStoryboard(episodeId, model, look)

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
      void this.pollRun(runState, opId, callbacks)

      return handleId
    } catch (error) {
      console.error(PosterGenerationLog.StoryboardError, error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /** project-scope: none — browser-side; the API route it calls mints the scope. */
  async generatePoster(
    projectId: string,
    episodeId: string,
    prompt: string,
    config: Record<string, unknown>,
    onComplete?: (url: string, meta?: { isVariantGrid: boolean }) => void,
    onError?: (error: unknown) => void,
  ): Promise<string | null> {
    console.log(`${PosterGenerationLog.PosterStart}${episodeId}`)

    const opId = `${PosterStorageKeyPrefix.PosterGen}${episodeId}`
    const callbacks: PosterGenCallbacks = { onComplete, onError }

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: PosterOperationTypeId.StoryAgent,
      label: PosterOperationLabel.GeneratingEpisodePoster,
      details: PosterOperationDetail.CreatingCinematicPoster,
      status: PosterOperationStatus.InProgress,
    })

    try {
      const episodePromise = fetchStorytellerEpisode(episodeId).catch(() => null)
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
        baselinePosterUrl: readEpisodePosterUrl(await episodePromise) ?? '',
        type: PosterGenerationType.Poster,
      }

      browserStorage.setObject(opId, runState)
      void this.pollRun(runState, opId, callbacks)

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
    callbacks?: PosterGenCallbacks,
    retryOnTimeout = true,
  ): Promise<void> {
    console.log(
      `${PosterGenerationLog.PollingStart}${runState.runId} (${runState.type || PosterUnknownLabel.Unknown})`,
    )

    const clear = () => this.clearRunState(runState, opId)
    let newerFromDb: string | null = null

    try {
      const result = await waitForTriggerRun(() => fetchPosterRunStatus(runState.runId), {
        intervalMs: POLLING_INTERVALS.DEFAULT,
        maxPolls:
          runState.type === PosterGenerationType.Storyboard
            ? STORYBOARD_VIDEO_MAX_POLLS
            : POSTER_RUN_MAX_POLLS,
        onPoll: data => {
          useGlobalStatusStore.getState().updateOperation(opId, {
            details: `${PosterOperationDetail.StatusPrefix}${data.status ?? POSTER_UNKNOWN_STATUS}`,
          })
          void this.readNewerPosterUrl(runState).then(url => {
            if (url) newerFromDb = url
          })
        },
        shouldAbort: () => newerFromDb !== null,
      })

      await this.finishPosterPoll(runState, opId, callbacks, clear, newerFromDb, result)
    } catch (error) {
      if (newerFromDb || error instanceof TriggerRunPollAbortedError) {
        await this.finishPosterPoll(runState, opId, callbacks, clear, newerFromDb, null)
        return
      }
      if (error instanceof TriggerRunPollFailedError) {
        console.error(PosterGenerationLog.Failed, error.runError || error.status)
        failPosterRun(callbacks, error, clear)
        return
      }
      console.error(PosterGenerationLog.PollingError, error)
      if (error instanceof TriggerRunPollTimeoutError) {
        await this.recoverPosterOrPark(runState, opId, callbacks, clear, retryOnTimeout)
        return
      }
      failPosterRun(callbacks, error, clear)
    }
  }

  private async finishPosterPoll(
    runState: PosterGenRunState,
    opId: string,
    callbacks: PosterGenCallbacks | undefined,
    clear: () => void,
    newerFromDb: string | null,
    result: TriggerRunStatusPayload | null,
  ): Promise<void> {
    if (newerFromDb) {
      await this.handleCompletion(runState, newerFromDb, opId, callbacks?.onComplete, false)
      return
    }
    const saved = await this.readNewerPosterUrl(runState)
    if (saved) {
      await this.handleCompletion(runState, saved, opId, callbacks?.onComplete, false)
      return
    }
    if (result) {
      await this.applyCompletedRun(runState, result, opId, callbacks, clear)
      return
    }
    failPosterRun(callbacks, new Error(PosterGenerationError.NoImageUrl), clear)
  }

  private async applyCompletedRun(
    runState: PosterGenRunState,
    result: TriggerRunStatusPayload,
    opId: string,
    callbacks: PosterGenCallbacks | undefined,
    clear: () => void,
  ): Promise<void> {
    const imageUrl = preferLatestPosterUrl(
      await this.readCurrentPosterUrl(runState),
      readTriggerRunOutputField(result, POSTER_IMAGE_URL_FIELD),
    )
    if (imageUrl) {
      const isVariantGrid = result.output?.[POSTER_IS_VARIANT_GRID_FIELD] === true
      await this.handleCompletion(runState, imageUrl, opId, callbacks?.onComplete, isVariantGrid)
      return
    }
    console.warn(PosterGenerationLog.NoImageUrl)
    failPosterRun(callbacks, new Error(PosterGenerationError.NoImageUrl), clear)
  }

  private async readCurrentPosterUrl(runState: PosterGenRunState): Promise<string | null> {
    if (runState.type === PosterGenerationType.Storyboard) return null
    try {
      return readEpisodePosterUrl(await fetchStorytellerEpisode(runState.episodeId))
    } catch {
      return null
    }
  }

  private async readNewerPosterUrl(runState: PosterGenRunState): Promise<string | null> {
    const saved = await this.readCurrentPosterUrl(runState)
    if (!isNewerPosterUrl(saved, runState.baselinePosterUrl)) return null
    console.log(PosterGenerationLog.RecoveredFromDb, runState.episodeId)
    return saved
  }

  private async recoverPosterOrPark(
    runState: PosterGenRunState,
    opId: string,
    callbacks: PosterGenCallbacks | undefined,
    clear: () => void,
    retryOnTimeout: boolean,
  ): Promise<void> {
    const saved = await this.readNewerPosterUrl(runState)
    if (saved) {
      await this.handleCompletion(runState, saved, opId, callbacks?.onComplete, false)
      return
    }
    if (runState.type === PosterGenerationType.Poster && retryOnTimeout) {
      void this.pollRun(runState, opId, callbacks, false)
      return
    }
    if (runState.type === PosterGenerationType.Poster) {
      console.warn(PosterGenerationLog.ParkedForResume, runState.runId)
      useGlobalStatusStore.getState().removeOperation(opId)
      return
    }
    failPosterRun(callbacks, new Error(PosterGenerationError.GenerationFailed), clear)
  }

  private async handleCompletion(
    runState: PosterGenRunState,
    imageUrl: string,
    opId: string,
    onComplete?: (url: string, meta?: { isVariantGrid: boolean }) => void,
    isVariantGrid = false,
  ): Promise<void> {
    try {
      if (runState.type === PosterGenerationType.Storyboard) {
        console.log(PosterGenerationLog.Persisting)
        try {
          await patchStorytellerEpisode(runState.episodeId, {
            [PosterPersistField.StoryboardUrl]: imageUrl,
          })
          console.log(PosterGenerationLog.PersistedStoryboard)
        } catch (dbErr) {
          console.error(`${PosterGenerationLog.PersistFailed}${runState.type} URL:`, dbErr)
        }
      }

      onComplete?.(imageUrl, { isVariantGrid })
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

  private resumeHost(): PosterResumeHost {
    return {
      readCurrentPosterUrl: runState => this.readCurrentPosterUrl(runState),
      handleCompletion: (runState, imageUrl, opId, onComplete, isVariantGrid) =>
        this.handleCompletion(runState, imageUrl, opId, onComplete, isVariantGrid),
      applyCompletedRun: (runState, result, opId, callbacks, clear) =>
        this.applyCompletedRun(runState, result, opId, callbacks, clear),
      clearRunState: (runState, opId) => this.clearRunState(runState, opId),
      pollRun: (runState, opId, callbacks, retryOnTimeout) =>
        this.pollRun(runState, opId, callbacks, retryOnTimeout),
    }
  }

  /** project-scope: none — browser-side; the API route it calls mints the scope. */
  resumePendingGenerations(
    projectId: string,
    onComplete?: (
      url: string,
      episodeId: string,
      type?: `${PosterGenerationType}`,
      meta?: { isVariantGrid: boolean },
    ) => void,
    onError?: (error: unknown, episodeId: string, type?: `${PosterGenerationType}`) => void,
    onResumed?: (episodeId: string, type?: `${PosterGenerationType}`) => void,
  ) {
    resumePendingPosterGenerations(this.resumeHost(), projectId, onComplete, onError, onResumed)
  }
}

export const posterGenerationService = new PosterGenerationService()
