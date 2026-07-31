import { agentConfig } from '@mastra/core/agent'
import {
  AgentModelRole,
  BeatPlannerAgentId,
  BeatPlannerAgentLabel,
  GrrmAuthorAgentDescription,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { composeBeatPlannerInstructions } from './compose-instructions'

export default agentConfig({
  id: BeatPlannerAgentId.BeatPlanner,
  name: BeatPlannerAgentLabel.BeatPlanner,
  description: GrrmAuthorAgentDescription.BeatPlanner,
  model: () => resolveRoleModel(AgentModelRole.Planner),
  instructions: () => composeBeatPlannerInstructions(),
})
