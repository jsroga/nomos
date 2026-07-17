'use client'

import React from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import type { Message } from '../../core/types'
import type { AgentLogActionComponent } from '../utils/agent-log-group-types'

interface AgentLogMessageActionsProps {
  msg: Message
  isHuman: boolean
  isSending: boolean
  displayName: string
  messageIndex: number
  ActionComponent: AgentLogActionComponent
  onApproveAllActions?: (messageIndex: number) => void
}

export const AgentLogMessageActions: React.FC<AgentLogMessageActionsProps> = ({
  msg,
  isHuman,
  isSending,
  displayName,
  messageIndex,
  ActionComponent,
  onApproveAllActions,
}) => {
  if (!msg.actions?.length) return null

  return (
    <div className={cn('mt-3 flex flex-wrap gap-2', isHuman ? 'justify-end' : 'pl-4')}>
      {msg.actions.length > 1 && onApproveAllActions && (
        <button
          onClick={() => onApproveAllActions(messageIndex)}
          disabled={isSending}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors shadow-sm',
            isSending && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Approve All ({msg.actions.length})
        </button>
      )}
      {msg.actions.map((action, actionIdx) => (
        <ActionComponent
          key={`${actionIdx}-${action.status || 'pending'}`}
          action={action}
          agentName={displayName}
          messageIndex={messageIndex}
          actionIndex={actionIdx}
        />
      ))}
    </div>
  )
}
