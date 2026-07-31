import '@/shared/data/server-guard'
import config from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { GrrmAuthorAgentId } from '@/domains/storyteller/ai/constants/agent-identity'

/** Stateless FS-assembled author (workflow registration). */
export const grrmAuthorAgent = assembleFsAgent(GrrmAuthorAgentId.GrrmAuthor, config)

export { composeGrrmInstructions, composeGrrmInstructionsCompact } from './compose-instructions'
