import { AIModel, AIModelConfig, TileContext } from './types'
import { MockAIModel } from './mock'
import { OpenAIModel } from './openai'
import { StabilityAIModel } from './stability'
import { CustomAIModel } from './custom'
import { GeminiAIModel } from './gemini'
import { MidjourneyAIModel } from './midjourney'
import { LocalStorageKeys } from '@/constants/localStorage'

class AIService {
  private models: Record<string, AIModel> = {}
  private activeModelId: string = 'mock'
  private configs: Record<string, AIModelConfig> = {}

  constructor() {
    this.registerModel(new MockAIModel())
    this.registerModel(new OpenAIModel())
    this.registerModel(new StabilityAIModel())
    this.registerModel(new CustomAIModel())
    this.registerModel(new GeminiAIModel())
    this.registerModel(new MidjourneyAIModel())

    // Load configs from local storage (only on client side)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LocalStorageKeys.AI_CONFIGS)
        if (saved) {
          this.configs = JSON.parse(saved)
        }
        const savedActive = localStorage.getItem(LocalStorageKeys.AI_ACTIVE_MODEL)
        if (savedActive) {
          this.activeModelId = savedActive
        }
      } catch (e) {
        console.error('Failed to load AI settings', e)
      }
    }
  }

  registerModel(model: AIModel) {
    this.models[model.id] = model
  }

  getAvailableModels() {
    return Object.values(this.models).map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
    }))
  }

  getActiveModelId() {
    return this.activeModelId
  }

  setActiveModel(id: string) {
    if (this.models[id]) {
      this.activeModelId = id
      if (typeof window !== 'undefined') {
        localStorage.setItem(LocalStorageKeys.AI_ACTIVE_MODEL, id)
      }
    }
  }

  getConfig(modelId: string) {
    return this.configs[modelId] || {}
  }

  updateConfig(modelId: string, config: AIModelConfig) {
    this.configs[modelId] = { ...this.configs[modelId], ...config }
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.AI_CONFIGS, JSON.stringify(this.configs))
    }
  }

  async generate(prompt: string, context: TileContext): Promise<string> {
    const model = this.models[this.activeModelId]
    if (!model) throw new Error('Active model not found')

    const config = this.configs[this.activeModelId] || {}

    // Validate config
    if (!model.validateConfig(config)) {
      throw new Error(`Configuration missing for ${model.name} (e.g. API Key)`)
    }

    return model.generate(prompt, context, config)
  }
}

// Export singleton instance
export const aiService = new AIService()
