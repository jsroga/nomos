import { z } from 'zod'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { NEXT_AGENT_END } from '@/domains/loop-creator/constants/graph-state-defaults'

export enum LoopCreatorPhaseValue {
  Initial = 'initial',
  Planning = 'planning',
  MechanicsDesign = 'mechanics_design',
  LoopAssembly = 'loop_assembly',
  BalanceAnalysis = 'balance_analysis',
  ProgressionDesign = 'progression_design',
  Review = 'review',
  Complete = 'complete',
}

const SUPERVISOR_NEXT_AGENT = [
  LoopAgentNode.Supervisor,
  LoopAgentNode.LoopPlanner,
  LoopAgentNode.MechanicsDesigner,
  LoopAgentNode.BalanceAnalyst,
  LoopAgentNode.ProgressionArchitect,
  LoopAgentNode.MarketAnalyst,
  NEXT_AGENT_END,
] as const

const SupervisorQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
})

const SupervisorActionSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export const SupervisorOutputSchema = z.object({
  thinking: z.string(),
  nextAgent: z.enum(SUPERVISOR_NEXT_AGENT),
  nextPhase: z.enum([
    LoopCreatorPhaseValue.Initial,
    LoopCreatorPhaseValue.Planning,
    LoopCreatorPhaseValue.MechanicsDesign,
    LoopCreatorPhaseValue.LoopAssembly,
    LoopCreatorPhaseValue.BalanceAnalysis,
    LoopCreatorPhaseValue.ProgressionDesign,
    LoopCreatorPhaseValue.Review,
    LoopCreatorPhaseValue.Complete,
  ]),
  message: z.string().optional(),
  questions: z.array(SupervisorQuestionSchema).optional(),
  taskForAgent: z.string().optional(),
  actions: z.array(SupervisorActionSchema).optional(),
})

export type SupervisorOutput = z.infer<typeof SupervisorOutputSchema>
