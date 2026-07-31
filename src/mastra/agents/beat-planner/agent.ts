import '@/shared/data/server-guard'
import config from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { BeatPlannerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'

export const beatPlannerAgent = assembleFsAgent(BeatPlannerAgentId.BeatPlanner, config)

export { composeBeatPlannerInstructions } from './compose-instructions'
