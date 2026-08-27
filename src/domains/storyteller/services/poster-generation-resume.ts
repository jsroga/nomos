import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { browserStorage } from '@/shared/data/browser-storage'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { fetchPosterRunStatus } from '@/domains/storyteller/core/io/poster.api'
import {
  isTriggerRunFailure,
  isTriggerRunSuccess,
  type TriggerRunStatusPayload,
} from '@/shared/data/polling/trigger-run-polling'
import { TriggerRunPollFailedError } from '@/shared/data/polling/wait-for-trigger-run'
import {
  PosterGenerationError,
  PosterGenerationLog,
  PosterGenerationType,
  PosterOperationDetail,
  PosterOperationLabel,
  PosterOperationStatus,
  PosterOperationTypeId,
  PosterRunStateField,
  PosterStorageKeyPrefix,
} from '@/domains/storyteller/services/constants/poster-generation-service'
import { isNewerPosterUrl, shouldSettleStoredPosterRun } from '@/domains/storyteller/services/poster-url-from-episode'

export interface PosterGenRunState {
  runId: string
  projectId: string
  episodeId: string
  prompt: string
  startedAt: string
  baselinePosterUrl?: string
  type?: `${PosterGenerationType}`
}

export type PosterGenCallbacks = {
  onComplete?: (url: string, meta?: { isVariantGrid: boolean }) => void
  onError?: (error: unknown) => void
}

export type PosterResumeCallbacks = PosterGenCallbacks & {
  onResumed?: (episodeId: string, type?: `${PosterGenerationType}`) => void
}

export interface PosterResumeHost {
  readCurrentPosterUrl: (runState: PosterGenRunState) => Promise<string | null>
  handleCompletion: (
    runState: PosterGenRunState,
    imageUrl: string,
    opId: string,
    onComplete?: (url: string, meta?: { isVariantGrid: boolean }) => void,
    isVariantGrid?: boolean,
  ) => Promise<void>
  applyCompletedRun: (
    runState: PosterGenRunState,
    result: TriggerRunStatusPayload,
    opId: string,
    callbacks: PosterGenCallbacks | undefined,
    clear: () => void,
  ) => Promise<void>
  clearRunState: (runState: PosterGenRunState, opId: string) => void
  pollRun: (
    runState: PosterGenRunState,
    opId: string,
    callbacks?: PosterGenCallbacks,
    retryOnTimeout?: boolean,
  ) => Promise<void>
}

export function failPosterRun(
  callbacks: PosterGenCallbacks | undefined,
  error: unknown,
  clear: () => void,
): void {
  clear()
  callbacks?.onError?.(error)
}

export function posterRunStateFromJson(raw: string): PosterGenRunState | null {
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
    baselinePosterUrl: readString(rec[PosterRunStateField.BaselinePosterUrl]) ?? '',
    type: Object.values(PosterGenerationType).find(t => t === typeValue),
  }
}

enum PosterStatusFetchResult {
  NotFound = 'not-found',
  Unreachable = 'unreachable',
}

function isPosterRunNotFound(error: unknown): boolean {
  return error instanceof ClientFetchError && error.status === HttpStatus.NOT_FOUND
}

async function fetchPosterStatusForSettle(
  runId: string,
): Promise<TriggerRunStatusPayload | PosterStatusFetchResult> {
  try {
    return await fetchPosterRunStatus(runId)
  } catch (error) {
    if (isPosterRunNotFound(error)) return PosterStatusFetchResult.NotFound
    return PosterStatusFetchResult.Unreachable
  }
}

export async function trySettleStoredPosterRun(
  host: PosterResumeHost,
  runState: PosterGenRunState,
  key: string,
  callbacks: PosterGenCallbacks,
): Promise<boolean> {
  const saved = await host.readCurrentPosterUrl(runState)
  const clear = () => host.clearRunState(runState, key)

  if (isNewerPosterUrl(saved, runState.baselinePosterUrl)) {
    await host.handleCompletion(runState, saved, key, callbacks.onComplete, false)
    return true
  }

  const status = await fetchPosterStatusForSettle(runState.runId)
  if (status === PosterStatusFetchResult.Unreachable) return false
  if (status === PosterStatusFetchResult.NotFound) {
    if (saved) {
      await host.handleCompletion(runState, saved, key, callbacks.onComplete, false)
      return true
    }
    failPosterRun(callbacks, new Error(PosterGenerationError.GenerationFailed), clear)
    return true
  }

  if (
    shouldSettleStoredPosterRun({
      savedPosterUrl: saved,
      baselinePosterUrl: runState.baselinePosterUrl,
      runSucceeded: isTriggerRunSuccess(status),
    })
  ) {
    await host.applyCompletedRun(runState, status, key, callbacks, clear)
    return true
  }

  if (isTriggerRunFailure(status)) {
    failPosterRun(
      callbacks,
      new TriggerRunPollFailedError(status.status, status.error),
      clear,
    )
    return true
  }

  return false
}

async function resumeStoredPosterRun(
  host: PosterResumeHost,
  key: string,
  raw: string,
  projectId: string,
  onComplete?: (
    url: string,
    episodeId: string,
    type?: `${PosterGenerationType}`,
    meta?: { isVariantGrid: boolean },
  ) => void,
  onError?: (error: unknown, episodeId: string, type?: `${PosterGenerationType}`) => void,
  onResumed?: (episodeId: string, type?: `${PosterGenerationType}`) => void,
): Promise<void> {
  try {
    const runState = posterRunStateFromJson(raw)
    if (!runState || runState.projectId !== projectId) return

    const callbacks: PosterResumeCallbacks = {
      onComplete: onComplete
        ? (url, meta) => onComplete(url, runState.episodeId, runState.type, meta)
        : undefined,
      onError: onError
        ? error => onError(error, runState.episodeId, runState.type)
        : undefined,
      onResumed,
    }

    if (await trySettleStoredPosterRun(host, runState, key, callbacks)) return

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
    callbacks.onResumed?.(runState.episodeId, runState.type)
    void host.pollRun(runState, key, callbacks)
  } catch {
    console.warn(PosterGenerationLog.ParseStateFailed, key)
  }
}

/**
 * project-scope: none — runs in the browser and reaches the database only
 * through authenticated API routes, which mint the scope server-side. A token
 * minted here would prove nothing, since the client cannot do the check.
 */
export function resumePendingPosterGenerations(
  host: PosterResumeHost,
  projectId: string,
  onComplete?: (
    url: string,
    episodeId: string,
    type?: `${PosterGenerationType}`,
    meta?: { isVariantGrid: boolean },
  ) => void,
  onError?: (error: unknown, episodeId: string, type?: `${PosterGenerationType}`) => void,
  onResumed?: (episodeId: string, type?: `${PosterGenerationType}`) => void,
): void {
  if (typeof window === 'undefined') return

  const prefixes = [PosterStorageKeyPrefix.PosterGen, PosterStorageKeyPrefix.StoryboardGen]
  for (const prefix of prefixes) {
    browserStorage.forEachPrefixed(prefix, (key, raw) => {
      void resumeStoredPosterRun(host, key, raw, projectId, onComplete, onError, onResumed)
    })
  }
}
