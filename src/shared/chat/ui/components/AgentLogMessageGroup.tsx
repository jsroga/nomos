'use client'

import React from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { ChatMessageRole } from '../../core/constants/chat-messages'
import type { AgentConfigMap, Message } from '../../core/types'
import {
  AGENT_LOG_DEFAULT_COLOR,
  AGENT_LOG_FALLBACK_AGENT,
  AgentWireId,
} from '../constants/agent-log'
import {
  getAgentDisplayName,
  isPureJsonMessage,
} from '../utils/agent-log-message-helpers'
import {
  resolveAgentConfig,
  type AgentLogActionComponent,
  type AgentLogQuestionComponent,
} from '../utils/agent-log-group-types'
import { AgentLogMessageActions } from './AgentLogMessageActions'
import { AgentLogMessageExtras } from './AgentLogMessageExtras'
import { AgentLogMessageHeader } from './AgentLogMessageHeader'
import { MessageContent, MessageHoverActions } from './AgentLogMessageContent'

function defaultAgentConfig() {
  return {
    color: AGENT_LOG_DEFAULT_COLOR,
    bgColor: 'bg-muted/10 border-border/20',
    icon: <Bot className="w-3.5 h-3.5" />,
  }
}

function shouldSkipMessage(msg: Message, isHuman: boolean, isActivityPanelOpen: boolean): boolean {
  if (!isHuman && !isActivityPanelOpen && isPureJsonMessage(msg)) {
    return true
  }
  return (
    !isHuman &&
    !msg.content?.trim() &&
    !msg.actions?.length &&
    !msg.questions?.length &&
    !msg.activityLog?.length &&
    msg.type !== ChatMessageRole.ConsistencyCheck
  )
}

interface AgentLogMessageGroupProps {
  msg: Message
  messageIndex: number
  agentConfig: AgentConfigMap
  isActivityPanelOpen: boolean
  showThinking: boolean
  isSending: boolean
  projectId?: string
  ActionComponent?: AgentLogActionComponent
  QuestionComponent?: AgentLogQuestionComponent
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  onApproveAllActions?: (messageIndex: number) => void
}

export const AgentLogMessageGroup: React.FC<AgentLogMessageGroupProps> = ({
  msg,
  messageIndex,
  agentConfig,
  isActivityPanelOpen,
  showThinking,
  isSending,
  projectId,
  ActionComponent,
  QuestionComponent,
  onQuestionAnswer,
  onQuestionSkip,
  onApproveAllActions,
}) => {
  const agentName = msg.sender || msg.name || AGENT_LOG_FALLBACK_AGENT
  const displayName = getAgentDisplayName(agentName)
  const isHuman = msg.type === ChatMessageRole.Human || agentName === AgentWireId.User
  const config = resolveAgentConfig(agentName, agentConfig) ?? defaultAgentConfig()

  if (shouldSkipMessage(msg, isHuman, isActivityPanelOpen)) {
    return null
  }

  return (
    <div
      className={cn(
        'text-sm animate-in fade-in slide-in-from-bottom-1 duration-300',
        isHuman ? 'ml-12' : 'mr-4'
      )}
    >
      <AgentLogMessageHeader
        msg={msg}
        isHuman={isHuman}
        displayName={displayName}
        config={config}
        isActivityPanelOpen={isActivityPanelOpen}
      />

      {showThinking && msg.thinking && isActivityPanelOpen && (
        <div className="mb-3 p-2.5 rounded border border-dashed border-border/40 text-[11px] text-muted-foreground italic leading-relaxed bg-muted/5">
          <span className="font-semibold not-italic text-[10px] uppercase tracking-wider opacity-70">
            Thinking:
          </span>{' '}
          {msg.thinking}
        </div>
      )}

      <div
        className={cn(
          'relative group leading-relaxed',
          isHuman
            ? 'text-right text-foreground/90'
            : 'text-foreground border-l-2 border-border/30 pl-4 py-0.5'
        )}
      >
        <MessageContent
          content={msg.content}
          isActivityPanelOpen={isActivityPanelOpen}
          hasActions={!!(msg.actions && msg.actions.length > 0)}
          projectId={projectId}
        />
        {!isHuman && isActivityPanelOpen && <MessageHoverActions content={msg.content} />}
      </div>

      {ActionComponent && (
        <AgentLogMessageActions
          msg={msg}
          isHuman={isHuman}
          isSending={isSending}
          displayName={displayName}
          messageIndex={messageIndex}
          ActionComponent={ActionComponent}
          onApproveAllActions={onApproveAllActions}
        />
      )}

      <AgentLogMessageExtras
        msg={msg}
        isHuman={isHuman}
        isActivityPanelOpen={isActivityPanelOpen}
        QuestionComponent={QuestionComponent}
        onQuestionAnswer={onQuestionAnswer}
        onQuestionSkip={onQuestionSkip}
      />
    </div>
  )
}
