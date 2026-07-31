import { IPromptRepository, PromptDefinition, PromptVariables } from './types'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'

export class PromptRepository implements IPromptRepository {
  private localRegistry: Map<string, PromptDefinition> = new Map()
  private useRemote: boolean

  constructor(useRemote: boolean = false) {
    this.useRemote = useRemote
  }

  register(definition: PromptDefinition) {
    this.localRegistry.set(definition.name, definition)
  }

  async getPrompt(name: string, variables: PromptVariables = {}): Promise<string> {
    if (this.useRemote) {
      console.warn(
        `[PromptRepository] Remote prompts are disabled; using local registry for '${name}'.`
      )
    }
    const definition = this.localRegistry.get(name)
    if (!definition) {
      throw new Error(`[PromptRepository] Prompt '${name}' not found in registry.`)
    }

    const template = definition.text

    // Interpolate variables
    return this.interpolate(template, variables)
  }

  private interpolate(template: string, variables: PromptVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key]
      if (value === undefined) {
        console.warn(`[PromptRepository] Missing variable '${key}' for prompt template.`)
        return `{{${key}}}`
      }
      return String(value)
    })
  }
}

// Singleton Instance
export const promptRepository = new PromptRepository(isFeatureEnabled(FeatureFlag.RemotePrompts))
