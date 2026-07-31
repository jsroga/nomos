import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { BeatPlannerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'

const EPISODE_CONTEXT_HEADER = '\n\n## Episode Context\n'

export function composeBeatPlannerInstructions(episodeContext?: string): string {
  const base = loadAgentInstructions(BeatPlannerAgentId.BeatPlanner)
  if (!episodeContext?.trim()) return base
  return `${base}${EPISODE_CONTEXT_HEADER}${episodeContext.trim()}`
}
