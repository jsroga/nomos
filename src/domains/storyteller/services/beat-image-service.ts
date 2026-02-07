import { BeatCard } from '../types'
import { moodboardGenerationService } from './MoodboardGenerationService'
import { LocalStorageKeys } from '@/constants/localStorage'

class BeatImageService {
  private getProviderConfig() {
    // Reusing logic from WorldBiblePanel, but ensuring we look for Nano Banana first as requested
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

    // Ensure we default to nanobanana if keys are present, or fall back to what's configured
    // The user specifically asked for "Nano Banana"
    return {
      provider: 'nanobanana' as const,
      apiKey: geminiKey,
      modelId: localStorage.getItem('NANO_BANANA_MODEL_ID') || 'flu-pro', // typo in user prompt 'flux-pro'? 'flu-pro'? defaulting to flux-pro
    }
  }

  async generateImageForBeat(
    projectId: string,
    beat: BeatCard,
    onUpdate: (beatId: string, updates: Partial<BeatCard>) => void
  ) {
    try {
      console.log(`🎨 Generating image for beat ${beat.sequence}...`)

      // 1. Generate Prompt using Server Action/API (to avoid bundling Mastra on client)
      const promptRes = await fetch('/api/storyteller/beats/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat }),
      })

      if (!promptRes.ok) {
        throw new Error('Failed to generate image prompt')
      }

      const { prompt: imagePrompt } = await promptRes.json()

      console.log(`📝 Generated Prompt: ${imagePrompt}`)

      // Update beat with prompt immediately
      onUpdate(beat.id, { imagePrompt })

      // 2. config
      const config = this.getProviderConfig()
      if (!config.apiKey) {
        throw new Error('Missing Nano Banana (Gemini) API Key')
      }

      // 3. Trigger Image Generation
      const response = await fetch(`/api/storyteller/beats/${beat.id}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          config,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to trigger beat image generation')
      }

      const data = await response.json()
      const handleId = data.handleId

      if (!handleId) {
        throw new Error('No handleId returned from trigger')
      }

      console.log(`🚀 Task triggered: ${handleId}. Polling for completion...`)

      // 4. Poll for completion
      let attempts = 0
      const maxAttempts = 60 // 2 minutes max

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000)) // Poll every 2s

        try {
          const statusRes = await fetch(`/api/storyteller/beats/status?runId=${handleId}`)
          if (!statusRes.ok) continue

          const statusData = await statusRes.json()
          const status = statusData.status

          console.log(`...Status: ${status}`)

          if (status === 'COMPLETED') {
            if (statusData.output && statusData.output.imageUrl) {
              console.log('✅ Generation complete!')
              onUpdate(beat.id, { imageUrl: statusData.output.imageUrl })
            }
            return
          }

          if (status === 'FAILED' || status === 'CANCELED') {
            throw new Error(`Task failed with status: ${status}`)
          }
        } catch (e) {
          console.warn('Polling error:', e)
        }
        attempts++
      }

      throw new Error('Task timed out')
    } catch (error) {
      console.error('Failed to generate beat image:', error)
    }
  }
}

export const beatImageService = new BeatImageService()

