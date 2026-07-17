import type React from 'react'
import type { AgentAction, AgentConfigMap, AgentQuestion, Message } from '../../core/types'
import { MessageGroupType } from '../constants/agent-log'

export type GroupedMessage = {
  type: MessageGroupType
  messages: Message[]
  originalIndices: number[]
}

export function resolveAgentConfig(agentName: string, agentConfig: AgentConfigMap) {
  if (agentConfig[agentName]) {
    return agentConfig[agentName]
  }
  const normalized = agentName.replace(/[_-]/g, '').toLowerCase()
  for (const [key, config] of Object.entries(agentConfig)) {
    if (key.toLowerCase() === normalized) {
      return config
    }
  }
  return undefined
}

export type AgentLogActionComponent = React.ComponentType<{
  action: AgentAction
  agentName: string
  messageIndex: number
  actionIndex: number
}>

export type AgentLogQuestionComponent = React.ComponentType<{
  question: AgentQuestion
  onAnswer: (a: string | string[]) => void
  onSkip?: () => void
}>
