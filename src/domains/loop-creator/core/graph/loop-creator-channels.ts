import { BaseMessage } from '@langchain/core/messages'
import {
  LOOP_CREATOR_PHASE_INITIAL,
  NEXT_AGENT_SUPERVISOR,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import type {
  BalanceAnalysis,
  GameLoop,
  LoopAgentAction,
  LoopAgentQuestion,
  LoopCreatorPhase,
  MechanicEdge,
  MechanicNode,
  NextAgent,
  ProgressionSystem,
} from './state'

export const loopCreatorChannels = {
  messages: {
    reducer: (existing: BaseMessage[], incoming: BaseMessage[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  mechanics: {
    reducer: (existing: MechanicNode[], incoming: MechanicNode[]) => {
      const byId = new Map(existing.map(m => [m.id, m]))
      for (const m of incoming) {
        byId.set(m.id, m)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  connections: {
    reducer: (existing: MechanicEdge[], incoming: MechanicEdge[]) => {
      const byId = new Map(existing.map(e => [e.id, e]))
      for (const e of incoming) {
        byId.set(e.id, e)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  loops: {
    reducer: (existing: GameLoop[], incoming: GameLoop[]) => {
      const byId = new Map(existing.map(l => [l.id, l]))
      for (const l of incoming) {
        byId.set(l.id, l)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  pendingActions: {
    reducer: (existing: LoopAgentAction[], incoming: LoopAgentAction[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  pendingQuestions: {
    reducer: (existing: LoopAgentQuestion[], incoming: LoopAgentQuestion[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  errors: {
    reducer: (existing: string[], incoming: string[]) => {
      return [...new Set([...existing, ...incoming])]
    },
    default: () => [],
  },
  projectId: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  sessionId: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  currentPhase: {
    reducer: (_: LoopCreatorPhase, incoming: LoopCreatorPhase) => incoming,
    default: (): LoopCreatorPhase => LOOP_CREATOR_PHASE_INITIAL,
  },
  nextAgent: {
    reducer: (_: NextAgent, incoming: NextAgent) => incoming,
    default: (): NextAgent => NEXT_AGENT_SUPERVISOR,
  },
  lastAgent: {
    reducer: (_: NextAgent | null, incoming: NextAgent | null) => incoming,
    default: (): NextAgent | null => null,
  },
  roundCount: { reducer: (_: number, incoming: number) => incoming, default: () => 0 },
  gameGenre: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  gamePlatform: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  targetAudience: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  gameDescription: { reducer: (_: string, incoming: string) => incoming, default: () => '' },
  referenceGames: { reducer: (_: string[], incoming: string[]) => incoming, default: () => [] },
  progressionSystems: {
    reducer: (_: ProgressionSystem[], incoming: ProgressionSystem[]) => incoming,
    default: () => [],
  },
  balanceAnalysis: {
    reducer: (_: BalanceAnalysis | null, incoming: BalanceAnalysis | null) => incoming,
    default: () => null,
  },
  userAnswers: {
    reducer: (_: Record<string, string | string[]>, incoming: Record<string, string | string[]>) =>
      incoming,
    default: () => ({}),
  },
  ragContext: { reducer: (_: unknown, incoming: unknown) => incoming, default: () => undefined },
  modelConfig: { reducer: (_: unknown, incoming: unknown) => incoming, default: () => undefined },
}
