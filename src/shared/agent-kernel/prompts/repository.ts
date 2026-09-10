import { IPromptRepository, PromptDefinition, PromptVariables } from './types'
import { readPromptBlockContent } from '@/shared/agent-kernel/mastra/editor-overlay'
import { registryPromptBlockId } from '@/shared/agent-kernel/prompts/prompt-block-id'

export class PromptRepository implements IPromptRepository {
  private localRegistry: Map<string, PromptDefinition> = new Map()

  register(definition: PromptDefinition) {
    this.localRegistry.set(definition.name, definition)
  }

  listRegistered(): PromptDefinition[] {
    return [...this.localRegistry.values()]
  }

  async getPrompt(name: string, variables: PromptVariables = {}): Promise<string> {
    const overlay = readPromptBlockContent(registryPromptBlockId(name))
    const definition = this.localRegistry.get(name)
    const template = overlay ?? definition?.text
    if (!template) {
      throw new Error(`[PromptRepository] Prompt '${name}' not found in registry.`)
    }

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

export const promptRepository = new PromptRepository()
