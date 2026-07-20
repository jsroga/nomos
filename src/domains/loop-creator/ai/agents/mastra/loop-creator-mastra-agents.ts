/**
 * Loop-creator Mastra agents — the flagged (`LOOP_CREATOR_MASTRA=1`) Mastra-native
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
import { Agent } from '@mastra/core/agent'
import { resolveLoopCreatorMastraModel } from '../../../config/model-config'

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
  role: LoopCreatorMastraAgentRole
): Agent {
  return new Agent({
    id,
    name,
    instructions: role,
    model: () => resolveLoopCreatorMastraModel(),
  })
}

export const loopCreatorSupervisorAgent = buildAgent(
  LoopCreatorMastraAgentId.Supervisor,
  LoopCreatorMastraAgentName.Supervisor,
  LoopCreatorMastraAgentRole.Supervisor
)
export const loopCreatorLoopPlannerAgent = buildAgent(
  LoopCreatorMastraAgentId.LoopPlanner,
  LoopCreatorMastraAgentName.LoopPlanner,
  LoopCreatorMastraAgentRole.LoopPlanner
)
export const loopCreatorMechanicsDesignerAgent = buildAgent(
  LoopCreatorMastraAgentId.MechanicsDesigner,
  LoopCreatorMastraAgentName.MechanicsDesigner,
  LoopCreatorMastraAgentRole.MechanicsDesigner
)
export const loopCreatorBalanceAnalystAgent = buildAgent(
  LoopCreatorMastraAgentId.BalanceAnalyst,
  LoopCreatorMastraAgentName.BalanceAnalyst,
  LoopCreatorMastraAgentRole.BalanceAnalyst
)
export const loopCreatorProgressionArchitectAgent = buildAgent(
  LoopCreatorMastraAgentId.ProgressionArchitect,
  LoopCreatorMastraAgentName.ProgressionArchitect,
  LoopCreatorMastraAgentRole.ProgressionArchitect
)
export const loopCreatorConceptEvaluatorAgent = buildAgent(
  LoopCreatorMastraAgentId.ConceptEvaluator,
  LoopCreatorMastraAgentName.ConceptEvaluator,
  LoopCreatorMastraAgentRole.ConceptEvaluator
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

/** Agents registered on the central Mastra instance (Studio parity). */
export const loopCreatorRuntimeAgents: Record<string, Agent> = {
  loopCreatorSupervisor: loopCreatorSupervisorAgent,
  loopCreatorLoopPlanner: loopCreatorLoopPlannerAgent,
  loopCreatorMechanicsDesigner: loopCreatorMechanicsDesignerAgent,
  loopCreatorBalanceAnalyst: loopCreatorBalanceAnalystAgent,
  loopCreatorProgressionArchitect: loopCreatorProgressionArchitectAgent,
  loopCreatorConceptEvaluator: loopCreatorConceptEvaluatorAgent,
}
