import { BeatCard } from '@/domains/storyteller/core/types/story-types'
import {
  fetchBeatImagePrompt,
  fetchBeatImageRunStatus,
  readBeatImageUrlFromRun,
  triggerBeatImageGeneration,
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

class BeatImageService {
  private getProviderConfig() {
    return {
      provider: BeatImageProvider.NanoBanana,
      modelId: browserStorage.getStringOrDefault(
        BEAT_IMAGE_MODEL_STORAGE_KEY,
        BEAT_IMAGE_DEFAULT_MODEL_ID
      ),
    }
  }

  async generateImageForBeat(
    _projectId: string,
    beat: BeatCard,
    onUpdate: (beatId: string, updates: Partial<BeatCard>) => void,
    options?: { shouldAbort?: () => boolean }
  ) {
    const shouldAbort = () => Boolean(options?.shouldAbort?.())
    try {
      if (shouldAbort()) return
      console.log(`🎨 Generating image for beat ${beat.sequence}...`)

      let imagePrompt: string
      try {
        imagePrompt = await fetchBeatImagePrompt(beat)
      } catch {
        throw new Error(BEAT_IMAGE_ERROR_PROMPT)
      }

      console.log(`📝 Generated Prompt: ${imagePrompt}`)
      onUpdate(beat.id, { imagePrompt })
      if (shouldAbort()) return

      const config = this.getProviderConfig()
      const opId = beatImageOperationId(beat.id)
      useGlobalStatusStore.getState().addOperation({
        id: opId,
        type: OperationTypeId.StoryAgent,
        label: BeatImageOperationLabel.GeneratingBeatImage,
        details: BeatImageOperationDetail.CreatingStoryboard,
        status: AsyncOperationStatus.InProgress,
      })

      try {
        let handleId: string | null
        try {
          const triggerResult = await triggerBeatImageGeneration(beat.id, {
            prompt: imagePrompt,
            config,
          })
          handleId = triggerResult.handleId
        } catch {
          throw new Error(BEAT_IMAGE_ERROR_TRIGGER)
        }

        if (!handleId) {
          throw new Error(BEAT_IMAGE_ERROR_NO_HANDLE)
        }

        console.log(`🚀 Task triggered: ${handleId}. Polling for completion...`)

        const runResult = await waitForTriggerRun(() => fetchBeatImageRunStatus(handleId), {
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
        if (imageUrl) {
          console.log(BEAT_IMAGE_LOG_COMPLETE)
          onUpdate(beat.id, { imageUrl })
        } else {
          throw new Error(BEAT_IMAGE_ERROR_NO_IMAGE)
        }
      } finally {
        useGlobalStatusStore.getState().removeOperation(opId)
      }
    } catch (error) {
      if (error instanceof TriggerRunPollAbortedError) return
      console.error(BEAT_IMAGE_LOG_GENERATION_FAILED, error)
      toast.error(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : BEAT_IMAGE_TOAST_FAILED,
      )
    }
  }
}

export const beatImageService = new BeatImageService()
