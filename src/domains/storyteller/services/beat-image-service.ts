import { BeatCard } from '@/domains/storyteller/core/types/story-types'
import {
  fetchBeatImagePrompt,
  fetchBeatImageRunStatus,
  readBeatImageUrlFromRun,
  triggerBeatImageGeneration,
  cancelBeatImageRun,
} from '@/domains/storyteller/core/io/beat-image.api'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  TriggerRunPollAbortedError,
  waitForTriggerRun,
} from '@/shared/data/polling/wait-for-trigger-run'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import toast from 'react-hot-toast'
import {
  BEAT_IMAGE_DEFAULT_MODEL_ID,
  BEAT_IMAGE_ERROR_NO_HANDLE,
  BEAT_IMAGE_ERROR_NO_IMAGE,
  BEAT_IMAGE_ERROR_PROMPT,
  BEAT_IMAGE_ERROR_TRIGGER,
  BEAT_IMAGE_LOG_COMPLETE,
  BEAT_IMAGE_LOG_GENERATION_FAILED,
  BEAT_IMAGE_LOG_POLLING_ERROR,
  BEAT_IMAGE_MODEL_STORAGE_KEY,
  BEAT_IMAGE_TOAST_FAILED,
  BeatImageOperationDetail,
  BeatImageOperationLabel,
  BeatImageProvider,
  beatImageOperationId,
} from '@/domains/storyteller/services/constants/beat-image-service'

const UNKNOWN_STATUS = 'unknown'

async function resolveBeatImagePrompt(beat: BeatCard, projectId: string): Promise<string> {
  try {
    return await fetchBeatImagePrompt(beat, projectId)
  } catch {
    throw new Error(BEAT_IMAGE_ERROR_PROMPT)
  }
}

async function triggerBeatImageHandle(
  beatId: string,
  prompt: string,
  config: Record<string, unknown>,
): Promise<string> {
  let handleId: string | null
  try {
    const triggerResult = await triggerBeatImageGeneration(beatId, {
      prompt,
      config: { provider: config.provider, modelId: config.modelId },
    })
    handleId = triggerResult.handleId
  } catch {
    throw new Error(BEAT_IMAGE_ERROR_TRIGGER)
  }
  if (!handleId) {
    throw new Error(BEAT_IMAGE_ERROR_NO_HANDLE)
  }
  return handleId
}

async function waitForBeatImageUrl(
  runId: string,
  opId: string,
  shouldAbort: () => boolean,
): Promise<string> {
  const runResult = await waitForTriggerRun(() => fetchBeatImageRunStatus(runId), {
    intervalMs: POLLING_INTERVALS.DEFAULT,
    shouldAbort,
    onPoll: data => {
      console.log(`...Status: ${data.status ?? UNKNOWN_STATUS}`)
      useGlobalStatusStore.getState().updateOperation(opId, {
        details: `${BeatImageOperationDetail.StatusPrefix}${data.status ?? UNKNOWN_STATUS}`,
      })
    },
    onFetchError: error => {
      console.warn(BEAT_IMAGE_LOG_POLLING_ERROR, error)
    },
  })
  const imageUrl = readBeatImageUrlFromRun(runResult)
  if (!imageUrl) {
    throw new Error(BEAT_IMAGE_ERROR_NO_IMAGE)
  }
  return imageUrl
}

function toastBeatImageFailure(error: unknown): void {
  toast.error(
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : BEAT_IMAGE_TOAST_FAILED,
  )
}

async function cancelBeatImageRunIfPresent(handleId: string | null): Promise<void> {
  if (handleId) await cancelBeatImageRun(handleId)
}

class BeatImageService {
  private getProviderConfig(): Record<string, unknown> {
    return {
      provider: BeatImageProvider.NanoBanana,
      modelId: browserStorage.getStringOrDefault(
        BEAT_IMAGE_MODEL_STORAGE_KEY,
        BEAT_IMAGE_DEFAULT_MODEL_ID
      ),
    }
  }

  /**
   * project-scope: none — runs in the browser and reaches the database only
   * through authenticated API routes, which mint the scope server-side. A token
   * minted here would prove nothing, since the client cannot do the check.
   */
  async generateImageForBeat(
    projectId: string,
    beat: BeatCard,
    onUpdate: (beatId: string, updates: Partial<BeatCard>) => void,
    options?: { shouldAbort?: () => boolean; onRunStarted?: (handleId: string) => void }
  ) {
    const shouldAbort = () => Boolean(options?.shouldAbort?.())
    if (shouldAbort()) return

    let handleId: string | null = null
    try {
      console.log(`🎨 Generating image for beat ${beat.sequence}...`)
      const imagePrompt = await resolveBeatImagePrompt(beat, projectId)
      console.log(`📝 Generated Prompt: ${imagePrompt}`)
      if (shouldAbort()) return
      onUpdate(beat.id, { imagePrompt })
      if (shouldAbort()) return

      const opId = beatImageOperationId(beat.id)
      useGlobalStatusStore.getState().addOperation({
        id: opId,
        type: OperationTypeId.StoryAgent,
        label: BeatImageOperationLabel.GeneratingBeatImage,
        details: BeatImageOperationDetail.CreatingStoryboard,
        status: AsyncOperationStatus.InProgress,
      })

      try {
        handleId = await triggerBeatImageHandle(beat.id, imagePrompt, this.getProviderConfig())
        if (shouldAbort()) {
          await cancelBeatImageRun(handleId)
          return
        }
        options?.onRunStarted?.(handleId)
        console.log(`🚀 Task triggered: ${handleId}. Polling for completion...`)
        const imageUrl = await waitForBeatImageUrl(handleId, opId, shouldAbort)
        if (shouldAbort()) {
          await cancelBeatImageRun(handleId)
          return
        }
        console.log(BEAT_IMAGE_LOG_COMPLETE)
        onUpdate(beat.id, { imageUrl })
      } finally {
        useGlobalStatusStore.getState().removeOperation(opId)
      }
    } catch (error) {
      if (error instanceof TriggerRunPollAbortedError) {
        await cancelBeatImageRunIfPresent(handleId)
        return
      }
      console.error(BEAT_IMAGE_LOG_GENERATION_FAILED, error)
      toastBeatImageFailure(error)
    }
  }
}

export const beatImageService = new BeatImageService()
