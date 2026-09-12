import { agentConfig } from '@mastra/core/agent'
import {
  MuseAgentDescription,
  MuseAgentId,
  MuseAgentName,
} from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'
import { AgentModelRole } from '@/domains/storyteller/ai/constants/agent-identity'
import { EDITOR_INSTRUCTIONS_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { loadPublishedOrFileBrief } from '@/shared/agent-kernel/mastra/load-published-brief'
import { AGENT_MODEL_MATRIX, resolveRoleModel } from '@/domains/storyteller/config/model-config'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { mastraCompletionSettings } from '@/shared/ai/gateway/output-budget'

/**
 * File-based Muse — blank-context brainstormer.
 * Muse slot only (STORYTELLER_MUSE_MODEL / matrix), not the chat picker.
 */
export default agentConfig({
  id: MuseAgentId.Muse,
  name: MuseAgentName.Muse,
  description: MuseAgentDescription.Muse,
  model: () => resolveRoleModel(AgentModelRole.Muse),
  instructions: () => loadPublishedOrFileBrief(MuseAgentId.Muse),
  editor: EDITOR_INSTRUCTIONS_ONLY,
  defaultOptions: mastraCompletionSettings(LlmFeature.StorytellerBeatPlan, {
    roleBudget: AGENT_MODEL_MATRIX.muse.maxOutputTokens,
  }),
})
