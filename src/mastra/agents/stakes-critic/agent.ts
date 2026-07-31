import '@/shared/data/server-guard'
import config from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'

export const stakesCritic = assembleFsAgent(CriticAgentId.Stakes, config)
