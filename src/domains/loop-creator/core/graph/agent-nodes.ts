import { readString } from '@/shared/data/json-guards'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { NEXT_AGENT_END } from '@/domains/loop-creator/constants/graph-state-defaults'
import type { NextAgent } from './state'

export { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'

export type AgentNode = LoopAgentNode

export const AGENT_NODE_KEYS = new Set<string>(Object.values(LoopAgentNode))

export function isRegisteredAgent(value: NextAgent | typeof NEXT_AGENT_END): value is LoopAgentNode {
  return value !== NEXT_AGENT_END && AGENT_NODE_KEYS.has(value)
}

export function parseNextAgent(value: unknown): NextAgent | typeof NEXT_AGENT_END {
  const raw = readString(value)
  if (raw === NEXT_AGENT_END) return NEXT_AGENT_END
  if (raw) {
    for (const agent of Object.values(LoopAgentNode)) {
      if (agent === raw) return agent
    }
  }
  return NEXT_AGENT_END
}

export function nextAgentFromAgentNode(agentName: string): NextAgent | null {
  for (const agent of Object.values(LoopAgentNode)) {
    if (agent === agentName) return agent
  }
  return null
}
