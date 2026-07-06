export interface PromptVariables {
  [key: string]: string | number | boolean | undefined
}

export interface PromptDefinition {
  name: string
  version: number
  text: string
  variables: string[] // List of expected variable names
  tags?: string[]
  modelConfig?: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
}

export interface IPromptRepository {
  getPrompt(name: string, variables?: PromptVariables): Promise<string>
  register(definition: PromptDefinition): void
}
