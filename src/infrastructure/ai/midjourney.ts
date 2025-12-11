import { AIModel, AIModelConfig, TileContext } from './types'

/**
 * Midjourney AI Model via LegNext AI
 * 
 * Note: Actual generation happens in the Trigger.dev task (generate-tile.ts).
 * This model is used for UI configuration and validation only.
 */
export class MidjourneyAIModel implements AIModel {
  id = 'midjourney'
  name = 'Midjourney (LegNext AI)'
  description = 'High-quality image generation via Midjourney using LegNext AI'

  validateConfig(config: AIModelConfig): boolean {
    return !!config.apiKey
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    // This should not be called directly - generation happens via Trigger.dev task
    // But we implement it for completeness in case someone tries to use it directly

    if (!config.apiKey) {
      throw new Error('LegNext API key is required for Midjourney generation')
    }

    throw new Error(
      'Midjourney generation should be triggered via Trigger.dev task. ' +
      'Direct generation is not supported in the browser.'
    )
  }
}

