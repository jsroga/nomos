import { IPromptRepository, PromptDefinition, PromptVariables } from './types'

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
    // Remote prompts (Langfuse hub) — lazy import so local-only paths (e.g. evals CLI) never load Langfuse
    if (this.useRemote) {
      try {
        const { langfuse } = await import('../../observability/observability')
        const remotePrompt = await langfuse.getPrompt(name)
        return remotePrompt.compile(variables)
      } catch (error) {
        console.warn(
          `[PromptRepository] Failed to fetch remote prompt '${name}'. Falling back to local.`,
          error
        )
      }
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
export const promptRepository = new PromptRepository(process.env.ENABLE_REMOTE_PROMPTS === 'true')
