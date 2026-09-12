import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import {
  LOOP_AGENT_DISPLAY_NAMES,
  LOOP_AGENT_WORKING_COPY,
  LoopOrchestratorEventType,
  LoopOrchestratorLog,
  LoopOrchestratorNodeStatus,
} from '@/domains/loop-creator/constants/loop-orchestrator'
import type { StreamEvent } from './stream-event'
import type { AgentNode } from './agent-nodes'

export function displayNameForNode(nodeName: string): string {
  for (const agent of Object.values(LoopAgentNode)) {
    if (agent === nodeName) {
      return LOOP_AGENT_DISPLAY_NAMES[agent]
    }
  }
  return nodeName
}

export function emitLog(onEvent: (event: StreamEvent) => void, content: string): void {
  console.log(content)
  onEvent({
    type: LoopOrchestratorEventType.Log,
    content,
    timestamp: Date.now(),
  })
}

export function emitAgentWorking(
  nodeName: AgentNode,
  onEvent: (event: StreamEvent) => void,
): void {
  const copy = LOOP_AGENT_WORKING_COPY[nodeName]
  onEvent({
    type: LoopOrchestratorEventType.Node,
    node: nodeName,
    agent: displayNameForNode(nodeName),
    status: LoopOrchestratorNodeStatus.Working,
    content: copy,
    timestamp: Date.now(),
  })
  emitLog(onEvent, `${LoopOrchestratorLog.Invoking}${nodeName}...`)
  emitLog(
    onEvent,
    `[${displayNameForNode(nodeName).replaceAll(' ', '')}]${LoopOrchestratorLog.CallingLlmSuffix}`,
  )
}

export async function runWithWorkingEvent<T>(
  nodeName: AgentNode,
  onEvent: (event: StreamEvent) => void,
  work: () => Promise<T>,
): Promise<T> {
  emitAgentWorking(nodeName, onEvent)
  return work()
}
