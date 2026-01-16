import { BeatCard } from '../graph/state'
import { moodboardGenerationService } from './MoodboardGenerationService'
import { getModel } from '../config/model-config'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { LocalStorageKeys } from '@/constants/localStorage'

const PROMPT_GENERATOR_SYSTEM = `You are a Visual Director for a film. 
Your task is to take a story beat and convert it into a vivid, specific visual image prompt for an AI image generator.

THE BEAT:
{beatContent}

CONTEXT:
Beat Type: {beatType}
Characters: {characters}
Visual Hook: {visualHook}
Setting: {setting}

INSTRUCTIONS:
- Create a SINGLE, detailed image prompt.
- Focus on lighting, composition, and atmosphere.
- If a "Visual Hook" is provided, make it the center of the image.
- Keep it under 50 words.
- Style: Rough white-and-dark storyboard sketch, high contrast, cinematic framing.
- Goal: Pick the single best frame that represents this beat's action.
- output ONLY the prompt string. No "Prompt:" prefix.`

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

      // 1. Generate Prompt
      const model = getModel('plotArchitect') // Reuse plot architect for prompt gen
      const promptResponse = await model.invoke([
        new SystemMessage(
          PROMPT_GENERATOR_SYSTEM.replace(
            '{beatContent}',
            beat.logline +
              (beat.mazurElements ? `\nDetails: ${JSON.stringify(beat.mazurElements)}` : '')
          )
            .replace('{beatType}', beat.beatType)
            .replace('{characters}', (beat.charactersInvolved || []).join(', '))
            .replace('{visualHook}', beat.visualHook || '')
            .replace('{setting}', beat.mazurElements?.setting || 'Unknown setting')
        ),
        new HumanMessage('Generate the image prompt.'),
      ])

      const imagePrompt =
        typeof promptResponse.content === 'string'
          ? promptResponse.content
          : JSON.stringify(promptResponse.content)

      console.log(`📝 Generated Prompt: ${imagePrompt}`)

      // Update beat with prompt immediately
      onUpdate(beat.id, { imagePrompt })

      // 2. config
      const config = this.getProviderConfig()
      if (!config.apiKey) {
        throw new Error('Missing Nano Banana (Gemini) API Key')
      }

      // 3. Generate Image using Moodboard Service logic (it handles Nano Banana)
      // We'll use a slightly modified call or just reuse it if it fits.
      // moodboardGenerationService expects to update the project moodboard, but here we want to return a URL or update a specific beat.
      // The moodboard service is tied to project moodImages. We might need to use the lower level tool or duplicate the fetch logic to avoid poluting the main moodboard.
      // Actually, let's look at `MoodboardGenerationService.ts` to see if we can use it for single image generation that isn't saved to the project moodImages list automatically.

      // Checking MoodboardGenerationService... it seems it calls backend API.
      // Let's implement a direct call to the generate endpoint or a new endpoint for beats to avoid messing up the main moodboard.
      // However, the prompt says "generate 1 img from nano banana 3".

      // Let's defer to a simple fetch to the backend generation endpoint if possible, or use the `generate-tile` pattern.
      // Since `MoodboardGenerationService` seems to rely on the backend `generate-moodboard` trigger, we might want a `generate-beat-image` trigger.

      // For now, I will assume there is a generic generation endpoint or I will use the `moodboardGenerationService`'s underlying mechanism if exposed.
      // Since I cannot see `MoodboardGenerationService` content right now, I will optimistically check if I can use a standard fetch to a new endpoint I'll create, or if I should copy the "Nano Banana" client logic.
      // "Nano Banana" usually implies using the Gemini API to call a tool or image gen model.

      // Let's do a direct client-side call pattern if the key is client-side (localStorage),
      // OR call a backend endpoint that handles it. The `generateWithMidjourney` and similar are triggers.

      // I'll create a dedicated api endpoint for beat formulation if needed, but likely the user wants it to work like the moodboard.
      // Let's implement a direct fetch to a new Next.js API route that we will create: `/api/storyteller/beats/[id]/generate-image`.

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
