import { agentConfig } from '@mastra/core/agent'
import type { GoalConfig } from '@mastra/core/agent'
import { AgentModelRole } from '@/domains/storyteller/ai/constants/agent-identity'
import { StorytellerModelRoleKey } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { readWorldBibleTool, checkContinuityTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { listCharactersTool } from '@/domains/storyteller/ai/tools/character-tools'
import { runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools/workflow-tool'
import {
  AutonomousAuthorDescription,
  AutonomousAuthorId,
  AutonomousAuthorName,
  STORYTELLER_AUTONOMOUS_MAX_RUNS,
} from './constants'
import {
  composeAutonomousAuthorInstructions,
  loadAutonomousGoalJudgePrompt,
} from './compose-instructions'

export const autonomousGoal: GoalConfig = {
  judge: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  maxRuns: STORYTELLER_AUTONOMOUS_MAX_RUNS,
  prompt: loadAutonomousGoalJudgePrompt(),
}

export default agentConfig({
  id: AutonomousAuthorId.Agent,
  name: AutonomousAuthorName.Agent,
  description: AutonomousAuthorDescription.Agent,
  model: () => resolveRoleModel(AgentModelRole.Author),
  instructions: () => composeAutonomousAuthorInstructions(getEntityLinkRequirements()),
  tools: {
    [runBeatDraftWorkflowTool.id]: runBeatDraftWorkflowTool,
    [listBeatsTool.id]: listBeatsTool,
    [readWorldBibleTool.id]: readWorldBibleTool,
    [checkContinuityTool.id]: checkContinuityTool,
    [listCharactersTool.id]: listCharactersTool,
  },
  goal: autonomousGoal,
})
