import { BeatCard } from '@/domains/storyteller/core/types/StoryTypes'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  BEAT_IMAGE_DEFAULT_MODEL_ID,
  BEAT_IMAGE_ERROR_MISSING_API_KEY,
  BEAT_IMAGE_ERROR_NO_HANDLE,
  BEAT_IMAGE_ERROR_PROMPT,
  BEAT_IMAGE_ERROR_TASK_TIMEOUT,
  BEAT_IMAGE_ERROR_TRIGGER,
  BEAT_IMAGE_LOG_COMPLETE,
  BEAT_IMAGE_LOG_GENERATION_FAILED,
  BEAT_IMAGE_LOG_POLLING_ERROR,
  BEAT_IMAGE_MODEL_STORAGE_KEY,
  BeatImageProvider,
  BeatImageTriggerStatus,
} from '@/domains/storyteller/services/constants/beat-image-service'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'

class BeatImageService {
  private getProviderConfig() {
    const geminiConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
    let geminiKey = ''
    try {
      if (geminiConfigStr) {
        const parsed = JSON.parse(geminiConfigStr)
        geminiKey = parsed.apiKey || ''
      }
    } catch {
      geminiKey = geminiConfigStr || ''
    }

    return {
      provider: BeatImageProvider.NanoBanana,
      apiKey: geminiKey,
      modelId: localStorage.getItem(BEAT_IMAGE_MODEL_STORAGE_KEY) || BEAT_IMAGE_DEFAULT_MODEL_ID,
    }
  }

  async generateImageForBeat(
    _projectId: string,
    beat: BeatCard,
    onUpdate: (beatId: string, updates: Partial<BeatCard>) => void
  ) {
    try {
      console.log(`🎨 Generating image for beat ${beat.sequence}...`)

      const promptRes = await fetch('/api/storyteller/beats/generate-prompt', {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({ beat }),
      })

      if (!promptRes.ok) {
        throw new Error(BEAT_IMAGE_ERROR_PROMPT)
      }

      const { prompt: imagePrompt } = await promptRes.json()

      console.log(`📝 Generated Prompt: ${imagePrompt}`)

      onUpdate(beat.id, { imagePrompt })

      const config = this.getProviderConfig()
      if (!config.apiKey) {
        throw new Error(BEAT_IMAGE_ERROR_MISSING_API_KEY)
      }

      const response = await fetch(`/api/storyteller/beats/${beat.id}/generate-image`, {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          prompt: imagePrompt,
          config,
        }),
      })

      if (!response.ok) {
        throw new Error(BEAT_IMAGE_ERROR_TRIGGER)
      }

      const data = await response.json()
      const handleId = data.handleId

      if (!handleId) {
        throw new Error(BEAT_IMAGE_ERROR_NO_HANDLE)
      }

      console.log(`🚀 Task triggered: ${handleId}. Polling for completion...`)

      let attempts = 0
      const maxAttempts = 60

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000))

        try {
          const statusRes = await fetch(`/api/storyteller/beats/status?runId=${handleId}`)
          if (!statusRes.ok) continue

          const statusData = await statusRes.json()
          const status = statusData.status

          console.log(`...Status: ${status}`)

          if (status === BeatImageTriggerStatus.Completed) {
            if (statusData.output && statusData.output.imageUrl) {
              console.log(BEAT_IMAGE_LOG_COMPLETE)
              onUpdate(beat.id, { imageUrl: statusData.output.imageUrl })
            }
            return
          }

          if (
            status === BeatImageTriggerStatus.Failed ||
            status === BeatImageTriggerStatus.Canceled
          ) {
            throw new Error(`Task failed with status: ${status}`)
          }
        } catch (e) {
          console.warn(BEAT_IMAGE_LOG_POLLING_ERROR, e)
        }
        attempts++
      }

      throw new Error(BEAT_IMAGE_ERROR_TASK_TIMEOUT)
    } catch (error) {
      console.error(BEAT_IMAGE_LOG_GENERATION_FAILED, error)
    }
  }
}

export const beatImageService = new BeatImageService()
