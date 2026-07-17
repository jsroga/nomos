'use client'

import React, { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Message } from '../../core/types'
import { DELEGATION_ELLIPSIS_SUFFIX } from '../constants/agent-log'
import { getAgentDisplayName } from '../utils/agent-log-message-helpers'

export const DelegationChain: React.FC<{ messages: Message[]; isComplete?: boolean }> = ({
  messages,
  isComplete = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (messages.length === 0) return null
  if (!isComplete) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <CheckCircle2 className="w-3 h-3 text-green-500/50" />
        <span>Processed ({messages.length} steps)</span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-4 pl-3 border-l border-muted space-y-1">
          {messages.map((msg, idx) => {
            const agentName = msg.sender || msg.name || 'Unknown'
            const displayName = getAgentDisplayName(agentName)
            return (
              <div key={idx} className="text-xs text-muted-foreground py-1">
                <span className="font-medium">{displayName}:</span>{' '}
                <span className="opacity-70">
                  {msg.content.slice(0, 80)}
                  {msg.content.length > 80 ? DELEGATION_ELLIPSIS_SUFFIX : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
