/**
 * Loop-creator Mastra agents — the flagged (`FF_LOOP_CREATOR_MASTRA=true`) Mastra-native
 * equivalents of the LangChain specialist functions, matching the storyteller
 * convention: plain `new Agent({ id, name, model: () => resolve…, instructions })`
 * registered on the central instance (see `core/io/mastra-runtime.ts`).
 *
 * Each specialist builds a full, state-templated system prompt per call, so the
 * agent's construction-time `instructions` is only the role identity — the real
 * prompt is passed per call via the `instructions` execution override (see
 * `loop-creator-completion.ts`). This file lives under `agents/` so it inherits
 * the AI-layer lint exemptions.
 */

import '@/shared/data/server-guard'
import type { Config } from '@mastra/core/mastra'
import { Agent } from '@mastra/core/agent'
import { resolveLoopCreatorMastraModel } from '../../../config/model-config'
import { marketAnalystAgent } from '../market-analyst'
import { marketAnalystTools } from '../market-analyst/tools-registry'
import { EDITOR_INSTRUCTIONS_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { MarketAnalystAgentId } from '../../constants/market-analyst-agent-wire'
import { LoopCreatorPurposeBody } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { loopCreatorPurposeDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'

export enum LoopCreatorMastraAgentId {
  Supervisor = 'loop-creator-supervisor',
  LoopPlanner = 'loop-creator-loop-planner',
  MechanicsDesigner = 'loop-creator-mechanics-designer',
  BalanceAnalyst = 'loop-creator-balance-analyst',
  ProgressionArchitect = 'loop-creator-progression-architect',
  ConceptEvaluator = 'loop-creator-concept-evaluator',
}

export enum LoopCreatorMastraAgentName {
  Supervisor = 'Loop Creator Supervisor',
  LoopPlanner = 'Loop Planner',
  MechanicsDesigner = 'Mechanics Designer',
  BalanceAnalyst = 'Balance Analyst',
  ProgressionArchitect = 'Progression Architect',
  ConceptEvaluator = 'Concept Evaluator',
}

/** One-line role identity; the full per-call prompt overrides this at run time. */
enum LoopCreatorMastraAgentRole {
  Supervisor = 'You are the supervisor of a game-design loop-creation crew; route work and synthesize results.',
  LoopPlanner = 'You are a game loop planner: design core/meta/social loops.',
  MechanicsDesigner = 'You are a game mechanics designer: create balanced, well-defined mechanics.',
  BalanceAnalyst = 'You are a game balance analyst: evaluate effort/reward and loop integrity.',
  ProgressionArchitect = 'You are a progression architect: design pacing and progression systems.',
  ConceptEvaluator = 'You are a concept-alignment evaluator: assess fit against the stated concept.',
}

function buildAgent(
  id: LoopCreatorMastraAgentId,
  name: LoopCreatorMastraAgentName,
  role: LoopCreatorMastraAgentRole,
  purpose: LoopCreatorPurposeBody,
): Agent {
  return new Agent({
    id,
    name,
    description: loopCreatorPurposeDescription(purpose),
    instructions: role,
    model: () => resolveLoopCreatorMastraModel(),
    editor: EDITOR_INSTRUCTIONS_ONLY,
  })
}

export const loopCreatorSupervisorAgent = buildAgent(
  LoopCreatorMastraAgentId.Supervisor,
  LoopCreatorMastraAgentName.Supervisor,
  LoopCreatorMastraAgentRole.Supervisor,
  LoopCreatorPurposeBody.Supervisor,
)
export const loopCreatorLoopPlannerAgent = buildAgent(
  LoopCreatorMastraAgentId.LoopPlanner,
  LoopCreatorMastraAgentName.LoopPlanner,
  LoopCreatorMastraAgentRole.LoopPlanner,
  LoopCreatorPurposeBody.LoopPlanner,
)
export const loopCreatorMechanicsDesignerAgent = buildAgent(
  LoopCreatorMastraAgentId.MechanicsDesigner,
  LoopCreatorMastraAgentName.MechanicsDesigner,
  LoopCreatorMastraAgentRole.MechanicsDesigner,
  LoopCreatorPurposeBody.MechanicsDesigner,
)
export const loopCreatorBalanceAnalystAgent = buildAgent(
  LoopCreatorMastraAgentId.BalanceAnalyst,
  LoopCreatorMastraAgentName.BalanceAnalyst,
  LoopCreatorMastraAgentRole.BalanceAnalyst,
  LoopCreatorPurposeBody.BalanceAnalyst,
)
export const loopCreatorProgressionArchitectAgent = buildAgent(
  LoopCreatorMastraAgentId.ProgressionArchitect,
  LoopCreatorMastraAgentName.ProgressionArchitect,
  LoopCreatorMastraAgentRole.ProgressionArchitect,
  LoopCreatorPurposeBody.ProgressionArchitect,
)
export const loopCreatorConceptEvaluatorAgent = buildAgent(
  LoopCreatorMastraAgentId.ConceptEvaluator,
  LoopCreatorMastraAgentName.ConceptEvaluator,
  LoopCreatorMastraAgentRole.ConceptEvaluator,
  LoopCreatorPurposeBody.ConceptEvaluator,
)

/** Agent lookup by id — used by the completion helper. */
export const loopCreatorMastraAgentById: Record<LoopCreatorMastraAgentId, Agent> = {
  [LoopCreatorMastraAgentId.Supervisor]: loopCreatorSupervisorAgent,
  [LoopCreatorMastraAgentId.LoopPlanner]: loopCreatorLoopPlannerAgent,
  [LoopCreatorMastraAgentId.MechanicsDesigner]: loopCreatorMechanicsDesignerAgent,
  [LoopCreatorMastraAgentId.BalanceAnalyst]: loopCreatorBalanceAnalystAgent,
  [LoopCreatorMastraAgentId.ProgressionArchitect]: loopCreatorProgressionArchitectAgent,
  [LoopCreatorMastraAgentId.ConceptEvaluator]: loopCreatorConceptEvaluatorAgent,
}

export const loopCreatorRuntimeTools: NonNullable<Config['tools']> = Object.fromEntries(
  marketAnalystTools.map(tool => [tool.id, tool]),
)

/**
 * Agents registered on the central Mastra instance (Studio parity). Keys match
 * agent.id. The supervisor-crew agents back the flagged
 * (`FF_LOOP_CREATOR_MASTRA=true`) specialist path; the market analyst is an
 * always-Mastra ReAct agent (native tools).
 */
export const loopCreatorRuntimeAgents: Record<string, Agent> = {
  [LoopCreatorMastraAgentId.Supervisor]: loopCreatorSupervisorAgent,
  [LoopCreatorMastraAgentId.LoopPlanner]: loopCreatorLoopPlannerAgent,
  [LoopCreatorMastraAgentId.MechanicsDesigner]: loopCreatorMechanicsDesignerAgent,
  [LoopCreatorMastraAgentId.BalanceAnalyst]: loopCreatorBalanceAnalystAgent,
  [LoopCreatorMastraAgentId.ProgressionArchitect]: loopCreatorProgressionArchitectAgent,
  [LoopCreatorMastraAgentId.ConceptEvaluator]: loopCreatorConceptEvaluatorAgent,
  [MarketAnalystAgentId.Id]: marketAnalystAgent,
}
