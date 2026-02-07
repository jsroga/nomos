
import { langfuse } from '../agent-core/observability'
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
        let template = ''

        // 1. Try Remote (Langfuse)
        if (this.useRemote) {
            try {
                // Langfuse SDK 'getPrompt' logic
                // Note: The JS SDK might differ slightly, ensuring we handle it gracefully
                const remotePrompt = await langfuse.getPrompt(name)
                // Assuming remotePrompt.compile(variables) exists
                return remotePrompt.compile(variables)
            } catch (error) {
                console.warn(`[PromptRepository] Failed to fetch remote prompt '${name}'. Falling back to local.`, error)
            }
        }

        // 2. Fallback to Local
        const definition = this.localRegistry.get(name)
        if (!definition) {
            throw new Error(`[PromptRepository] Prompt '${name}' not found in registry.`)
        }

        template = definition.text

        // 3. Interpolate Variables
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
