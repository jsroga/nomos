import '@/shared/data/server-guard'
import config from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'

export const storytellerChatAgent = assembleFsAgent(StorytellerAgentId.Storyteller, config)

export { composeChatAdapterInstructions } from './compose-instructions'
