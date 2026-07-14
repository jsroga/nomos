/** Agent status values shared by AgentLog and useChatStream. */

export enum AgentStatusKind {
  Idle = 'idle',
  Thinking = 'thinking',
  Working = 'working',
  Complete = 'complete',
  Error = 'error',
  Waiting = 'waiting',
}

export type AgentStatus = `${AgentStatusKind}`

export const AGENT_STATUS_LABELS: Record<AgentStatusKind, string> = {
  [AgentStatusKind.Thinking]: 'Thinking',
  [AgentStatusKind.Working]: 'Working',
  [AgentStatusKind.Complete]: 'Complete',
  [AgentStatusKind.Error]: 'Error',
  [AgentStatusKind.Waiting]: 'Waiting',
  [AgentStatusKind.Idle]: 'Idle',
}
