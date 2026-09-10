import '../../../data/server-guard'
import { Agent } from '@mastra/core/agent'
import type { GoalConfig } from '@mastra/core/agent'
import { toOpenRouterModel, TEXT_GEN_FAST_MODEL } from '../../models'
import { EDITOR_INSTRUCTIONS_ONLY } from '../editor-permissions'
import { createInheritedAgentMemory } from '../studio-memory'
import {
  HourLoopBudget,
  QualityImproverAgentDescription,
  QualityImproverAgentId,
  QualityImproverAgentName,
  QualityImproverGoalPrompt,
  QUALITY_IMPROVER_INSTRUCTIONS,
} from './constants'
import {
  pinLiveDatasetTool,
  readExperimentRowsTool,
  startLiveExperimentTool,
  writeEditorDraftTool,
  writeRunNoteTool,
} from './tools'

const qualityImproverGoal: GoalConfig = {
  judge: () => toOpenRouterModel(TEXT_GEN_FAST_MODEL),
  maxRuns: HourLoopBudget.MaxRuns,
  prompt: QualityImproverGoalPrompt.Stop,
}

export const qualityImproverAgent = new Agent({
  id: QualityImproverAgentId.QualityImprover,
  name: QualityImproverAgentName.QualityImprover,
  description: QualityImproverAgentDescription.QualityImprover,
  instructions: QUALITY_IMPROVER_INSTRUCTIONS,
  model: () => toOpenRouterModel(TEXT_GEN_FAST_MODEL),
  memory: createInheritedAgentMemory(),
  editor: EDITOR_INSTRUCTIONS_ONLY,
  durable: true,
  goal: qualityImproverGoal,
  tools: {
    [pinLiveDatasetTool.id]: pinLiveDatasetTool,
    [startLiveExperimentTool.id]: startLiveExperimentTool,
    [readExperimentRowsTool.id]: readExperimentRowsTool,
    [writeEditorDraftTool.id]: writeEditorDraftTool,
    [writeRunNoteTool.id]: writeRunNoteTool,
  },
})
