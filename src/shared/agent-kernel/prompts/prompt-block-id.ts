import { PromptBlockPrefix } from './constants/prompt-block-ids'

export function briefPromptBlockId(agentId: string): string {
  return `${PromptBlockPrefix.Brief}${agentId}`
}

export function registryPromptBlockId(promptName: string): string {
  return `${PromptBlockPrefix.Registry}${promptName}`
}
