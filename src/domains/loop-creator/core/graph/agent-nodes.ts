import { readString } from '@/shared/data/json-guards'
import type { NextAgent } from './state'

export const AGENT_NODES = {
  supervisor: 'supervisor',
  loop_planner: 'loop_planner',
  mechanics_designer: 'mechanics_designer',
  balance_analyst: 'balance_analyst',
  progression_architect: 'progression_architect',
  market_analyst: 'market_analyst',
} as const

export type AgentNode = keyof typeof AGENT_NODES

export const AGENT_NODE_KEYS = new Set<string>(Object.keys(AGENT_NODES))

export function isRegisteredAgent(value: NextAgent | 'END'): value is AgentNode {
  return value !== 'END' && AGENT_NODE_KEYS.has(value)
}

export function parseNextAgent(value: unknown): NextAgent | 'END' {
  const raw = readString(value)
  if (raw === 'END') return 'END'
  for (const key of AGENT_NODE_KEYS) {
    if (key === raw) return key
  }
  return 'END'
}

export function nextAgentFromAgentNode(agentName: string): NextAgent | null {
  switch (agentName) {
    case AGENT_NODES.supervisor:
      return 'supervisor'
    case AGENT_NODES.loop_planner:
      return 'loop_planner'
    case AGENT_NODES.mechanics_designer:
      return 'mechanics_designer'
    case AGENT_NODES.balance_analyst:
      return 'balance_analyst'
    case AGENT_NODES.progression_architect:
      return 'progression_architect'
    case AGENT_NODES.market_analyst:
      return 'market_analyst'
    default:
      return null
  }
}
