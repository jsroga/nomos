import { BeatCard } from '@/domains/storyteller/core/types/story-types'
import {
  fetchBeatImagePrompt,
  fetchBeatImageRunStatus,
  readBeatImageUrlFromRun,
  triggerBeatImageGeneration,
} from '@/domains/storyteller/core/io/beat-image.api'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { browserStorage } from '@/shared/data/browser-storage'
import { waitForTriggerRun } from '@/shared/data/polling/wait-for-trigger-run'
import {
  BEAT_IMAGE_DEFAULT_MODEL_ID,
  BEAT_IMAGE_ERROR_MISSING_API_KEY,
  BEAT_IMAGE_ERROR_NO_HANDLE,
  BEAT_IMAGE_ERROR_PROMPT,
  BEAT_IMAGE_ERROR_TRIGGER,
  BEAT_IMAGE_LOG_COMPLETE,
  BEAT_IMAGE_LOG_GENERATION_FAILED,
  BEAT_IMAGE_LOG_POLLING_ERROR,
  BEAT_IMAGE_MODEL_STORAGE_KEY,
  BeatImageProvider,
} from '@/domains/storyteller/services/constants/beat-image-service'

class BeatImageService {
  private getProviderConfig() {
    return {
      provider: BeatImageProvider.NanoBanana,
      apiKey: browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_GEMINI),
      modelId: browserStorage.getStringOrDefault(
        BEAT_IMAGE_MODEL_STORAGE_KEY,
        BEAT_IMAGE_DEFAULT_MODEL_ID
      ),
    }
  }

  async generateImageForBeat(
    _projectId: string,
    beat: BeatCard,
    onUpdate: (beatId: string, updates: Partial<BeatCard>) => void
  ) {
    try {
      console.log(`🎨 Generating image for beat ${beat.sequence}...`)

      let imagePrompt: string
      try {
        imagePrompt = await fetchBeatImagePrompt(beat)
      } catch {
        throw new Error(BEAT_IMAGE_ERROR_PROMPT)
      }

      console.log(`📝 Generated Prompt: ${imagePrompt}`)
      onUpdate(beat.id, { imagePrompt })

      const config = this.getProviderConfig()
      if (!config.apiKey) {
        throw new Error(BEAT_IMAGE_ERROR_MISSING_API_KEY)
      }

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
        intervalMs: POLLING_INTERVALS.FAST,
        onPoll: data => {
          console.log(`...Status: ${data.status ?? 'unknown'}`)
        },
        onFetchError: error => {
          console.warn(BEAT_IMAGE_LOG_POLLING_ERROR, error)
        },
      })

      const imageUrl = readBeatImageUrlFromRun(runResult)
      if (imageUrl) {
        console.log(BEAT_IMAGE_LOG_COMPLETE)
        onUpdate(beat.id, { imageUrl })
      }
    } catch (error) {
      console.error(BEAT_IMAGE_LOG_GENERATION_FAILED, error)
    }
  }
}

export const beatImageService = new BeatImageService()
