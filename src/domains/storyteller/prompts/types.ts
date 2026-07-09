/**
 * Prompt Types
 *
 * Common types for prompt definitions in the storyteller module.
 */

export interface PromptDefinition {
  name: string
  version: number
  text: string
  /** Expected template variable names (aligned with agent-kernel PromptDefinition). */
  variables?: string[]
  tags?: string[]
  modelConfig?: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
}
