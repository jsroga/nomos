'use client'

import React from 'react'
import { cn } from '@/shared/data/utils'
import { ChatMessageRole } from '../../core/constants/chat-messages'
import type { Message } from '../../core/types'
import { useChatRenderers } from '../../core/renderers'
import { ActivityLogViewer } from './ActivityLogViewer'
import type { AgentLogQuestionComponent } from '../utils/agent-log-group-types'

interface AgentLogMessageExtrasProps {
  msg: Message
  isHuman: boolean
  isActivityPanelOpen: boolean
  QuestionComponent?: AgentLogQuestionComponent
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
}

export const AgentLogMessageExtras: React.FC<AgentLogMessageExtrasProps> = ({
  msg,
  isHuman,
  isActivityPanelOpen,
  QuestionComponent,
  onQuestionAnswer,
  onQuestionSkip,
}) => {
  const renderers = useChatRenderers()

  return (
    <>
      {msg.questions && msg.questions.length > 0 && QuestionComponent && (
        <div className={cn('mt-4 space-y-3', isHuman ? 'items-end' : 'pl-4')}>
          {msg.questions.map(question => (
            <QuestionComponent
              key={question.id}
              question={question}
              onAnswer={answer => onQuestionAnswer?.(question.id, answer)}
              onSkip={
                question.urgency !== 'blocking'
                  ? () => onQuestionSkip?.(question.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {msg.type === ChatMessageRole.ConsistencyCheck && msg.consistencyResult != null && (
        <div className={cn('mt-4', isHuman ? 'items-end' : 'pl-4')}>
          {renderers.renderConsistency?.(msg.consistencyResult, { canUndo: true }) ?? null}
        </div>
      )}

      {isActivityPanelOpen && msg.activityLog && msg.activityLog.length > 0 && (
        <div className="w-full max-w-[85%] mt-4 animate-in fade-in zoom-in-95 duration-300 origin-top-left">
          <ActivityLogViewer logs={msg.activityLog} />
        </div>
      )}
    </>
  )
}
