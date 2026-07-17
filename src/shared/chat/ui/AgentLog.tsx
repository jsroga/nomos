'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Message,
  AgentConfigMap,
  AgentQuestion,
  AgentAction,
  ThinkingMessagesConfig,
  DEFAULT_THINKING_MESSAGES,
} from '../core/types'
import { AGENT_LOG_SCROLL_BEHAVIOR, MessageGroupType } from './constants/agent-log'
import { AgentLogGroupItem } from './components/AgentLogGroupItem'
import {
  ActiveAgentsPanel,
  AgentStatusIndicator,
  type AgentStatusInfo,
} from './components/AgentStatusPanel'
import { AgentLogStatusFooter } from './components/AgentLogStatusFooter'
import { useCurrentAgent } from './hooks/useAgentLogGrouping'
import { buildAgentLogGroups } from './utils/build-agent-log-groups'
import type { AgentStatus } from './constants/agent-status'

export type { AgentStatus, AgentStatusInfo }
export { AgentStatusIndicator, ActiveAgentsPanel }

interface AgentLogProps {
  messages: Message[]
  agentConfig: AgentConfigMap
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  onApproveAllActions?: (messageIndex: number) => void
  onClose?: () => void
  showThinking?: boolean
  children?: React.ReactNode
  ActionComponent?: React.ComponentType<{
    action: AgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  }>
  QuestionComponent?: React.ComponentType<{
    question: AgentQuestion
    onAnswer: (a: string | string[]) => void
    onSkip?: () => void
  }>
  activeAgents?: AgentStatusInfo[]
  showActiveAgents?: boolean
  isActivityPanelOpen?: boolean
  isSending?: boolean
  thinkingAgent?: string | null
  thinkingMessagesConfig?: ThinkingMessagesConfig
  streamingTokens?: string
  currentPhase?: string
  activeOperations?: Array<{
    id: string
    type: string
    label: string
    startTime?: number
    tool?: string
  }>
  projectId?: string
}

export const AgentLog: React.FC<AgentLogProps> = React.memo(({
  messages,
  agentConfig,
  onQuestionAnswer,
  onQuestionSkip,
  onApproveAllActions,
  onClose: _onClose,
  showThinking = false,
  children,
  ActionComponent,
  QuestionComponent,
  activeAgents = [],
  showActiveAgents = true,
  isActivityPanelOpen = false,
  currentPhase,
  activeOperations = [],
  isSending = false,
  thinkingAgent,
  thinkingMessagesConfig = DEFAULT_THINKING_MESSAGES,
  streamingTokens,
  projectId,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const [prevIsSending, setPrevIsSending] = useState(isSending)
  const [hasProcessed, setHasProcessed] = useState(false)
  const [thinkingTime, setThinkingTime] = useState(0)

  if (isSending !== prevIsSending) {
    setPrevIsSending(isSending)
    if (isSending) {
      setHasProcessed(false)
      setThinkingTime(0)
    } else {
      setHasProcessed(true)
    }
  }

  const currentAgent = useCurrentAgent(isSending, thinkingAgent, activeAgents, messages)
  const groupedMessages = useMemo(() => buildAgentLogGroups(messages), [messages])

  useEffect(() => {
    if (!isSending) return undefined
    const interval = setInterval(() => {
      setThinkingTime(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isSending])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: AGENT_LOG_SCROLL_BEHAVIOR })
    }
  }, [messages, activeAgents, isSending, hasProcessed])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-4"
    >
      {groupedMessages.map((group, groupIdx) => (
        <AgentLogGroupItem
          key={group.type === MessageGroupType.Delegation ? `delegation-${groupIdx}` : groupIdx}
          group={group}
          groupIdx={groupIdx}
          totalGroups={groupedMessages.length}
          isActivityPanelOpen={isActivityPanelOpen}
          isSending={isSending}
          showThinking={showThinking}
          agentConfig={agentConfig}
          projectId={projectId}
          ActionComponent={ActionComponent}
          QuestionComponent={QuestionComponent}
          onQuestionAnswer={onQuestionAnswer}
          onQuestionSkip={onQuestionSkip}
          onApproveAllActions={onApproveAllActions}
        />
      ))}

      {showActiveAgents && isActivityPanelOpen && activeAgents.length > 0 && (
        <ActiveAgentsPanel activeAgents={activeAgents} agentConfig={agentConfig} />
      )}

      <AgentLogStatusFooter
        isSending={isSending}
        hasProcessed={hasProcessed}
        isActivityPanelOpen={isActivityPanelOpen}
        currentPhase={currentPhase}
        activeOperations={activeOperations}
        streamingTokens={streamingTokens}
        currentAgent={currentAgent}
        agentConfig={agentConfig}
        thinkingMessagesConfig={thinkingMessagesConfig}
        thinkingTime={thinkingTime}
      />

      {children}

      <div ref={bottomRef} />
    </div>
  )
})

AgentLog.displayName = 'AgentLog'
