import type { EntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import { ChatInstructionPlaceholder } from './constants'

/** Inject runtime entity-link minimums into the static chat-adapter brief. */
export function composeChatAdapterInstructions(reqs: EntityLinkRequirements): string {
  return loadAgentInstructions(StorytellerAgentId.Storyteller)
    .replaceAll(ChatInstructionPlaceholder.MinItems, String(reqs.minItems))
    .replaceAll(ChatInstructionPlaceholder.MinEvents, String(reqs.minEvents))
    .replaceAll(ChatInstructionPlaceholder.MinRules, String(reqs.minRules))
}
