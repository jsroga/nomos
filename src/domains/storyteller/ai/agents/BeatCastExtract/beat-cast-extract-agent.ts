import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { getAgentModel } from '@/domains/storyteller/config/constants/model-config'
import { generateStructured } from '@/domains/storyteller/ai/agents/critics/generate-structured'
import {
  BeatCastExtractSchema,
  type BeatCastExtract,
} from '@/domains/storyteller/ai/prompts/schemas/beat-cast-extract-schema'
import {
  BeatCastExtractAgentId,
  BeatCastExtractAgentLabel,
  BeatCastExtractCopy,
} from './constants/beat-cast-extract-agent'

export const beatCastExtractAgent = new Agent({
  id: BeatCastExtractAgentId.BeatCastExtract,
  name: BeatCastExtractAgentLabel.BeatCastExtract,
  instructions: BeatCastExtractCopy.Instructions,
  model: () => getAgentModel(TEXT_GEN_FAST_MODEL),
})

export async function extractBeatCastNames(prompt: string): Promise<BeatCastExtract | null> {
  return generateStructured(beatCastExtractAgent, prompt, BeatCastExtractSchema)
}
