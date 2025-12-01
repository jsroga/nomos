/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIModel, AIModelConfig, TileContext } from './types'

export class MockAIModel implements AIModel {
  id = 'mock'
  name = 'Mock Generator'
  description = 'Generates placeholder colors based on prompt. Free and fast.'

  validateConfig(config: AIModelConfig): boolean {
    return true
  }

  async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        // Deterministic color based on prompt
        let hash = 0
        for (let i = 0; i < prompt.length; i++) {
          hash = prompt.charCodeAt(i) + ((hash << 5) - hash)
        }
        const color = Math.floor(Math.abs(Math.sin(hash) * 16777215))
          .toString(16)
          .padStart(6, '0')

        // Check context to see if we should blend (mocking context awareness)
        const neighborCount = Object.values(context.neighbors).filter(Boolean).length
        const contextText = neighborCount > 0 ? `+ ${neighborCount} neighbors` : 'Center'

        resolve(
          `https://placehold.co/1024x1024/${color}/white?text=${encodeURIComponent(prompt.slice(0, 15) + '... ' + contextText)}`
        )
      }, 1500)
    })
  }
}
