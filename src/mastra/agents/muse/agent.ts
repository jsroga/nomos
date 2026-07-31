import '@/shared/data/server-guard'
import config from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { MuseAgentId } from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'

export const museAgent = assembleFsAgent(MuseAgentId.Muse, config)
