'use client'

import React, { useEffect, useState } from 'react'
import {
  Bot,
  Brain,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/data/utils'
import type { AgentConfigMap } from '../../core/types'
import {
  AgentStatusKind,
  AGENT_STATUS_LABELS,
  type AgentStatus,
} from '../constants/agent-status'
import { getAgentDisplayName } from '../utils/agent-log-message-helpers'

export type { AgentStatus }

export interface AgentStatusInfo {
  agent: string
  status: AgentStatus
  message?: string
  startTime?: number
  details?: string
}

interface AgentStatusIndicatorProps {
  agent: string
  config: {
    color: string
    bgColor?: string
    icon: React.ReactNode
  }
  status: AgentStatus
  message?: string
  details?: string
  startTime: number
  showDetails?: boolean
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  agent,
  config,
  status,
  message,
  details,
  startTime,
  showDetails = true,
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status === AgentStatusKind.Thinking || status === AgentStatusKind.Working) {
      const interval = setInterval(() => {
        if (startTime) {
          setElapsed(Math.floor((Date.now() - startTime) / 1000))
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status, startTime])

  const getStatusIcon = () => {
    switch (status) {
      case AgentStatusKind.Thinking:
        return <Brain className="w-3.5 h-3.5" />
      case AgentStatusKind.Working:
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />
      case AgentStatusKind.Complete:
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
      case AgentStatusKind.Error:
        return <AlertCircle className="w-3.5 h-3.5 text-red-500/70" />
      case AgentStatusKind.Waiting:
        return <Clock className="w-3.5 h-3.5 text-amber-500/70" />
      default:
        return config.icon
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case AgentStatusKind.Thinking:
        return AGENT_STATUS_LABELS[AgentStatusKind.Thinking]
      case AgentStatusKind.Working:
        return AGENT_STATUS_LABELS[AgentStatusKind.Working]
      case AgentStatusKind.Complete:
        return AGENT_STATUS_LABELS[AgentStatusKind.Complete]
      case AgentStatusKind.Error:
        return AGENT_STATUS_LABELS[AgentStatusKind.Error]
      case AgentStatusKind.Waiting:
        return AGENT_STATUS_LABELS[AgentStatusKind.Waiting]
      default:
        return AGENT_STATUS_LABELS[AgentStatusKind.Idle]
    }
  }

  const isActive =
    status === AgentStatusKind.Thinking || status === AgentStatusKind.Working

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded border border-border/20 bg-muted/5',
        isActive && 'border-primary/20'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="opacity-70">{getStatusIcon()}</div>
        <span className="font-bold text-[10px] uppercase tracking-widest opacity-80">
          {getAgentDisplayName(agent)}
        </span>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{message || getStatusLabel()}</span>

        {isActive && elapsed > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">({elapsed}s)</span>
        )}
      </div>

      {showDetails && details && (
        <span className="text-[10px] text-muted-foreground/40 truncate max-w-[150px] font-mono">
          {details}
        </span>
      )}
    </motion.div>
  )
}

export const ActiveAgentsPanel: React.FC<{
  activeAgents: AgentStatusInfo[]
  agentConfig: AgentConfigMap
}> = ({ activeAgents, agentConfig }) => {
  if (activeAgents.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {activeAgents.map(status => (
          <AgentStatusIndicator
            key={status.agent}
            agent={status.agent}
            status={status.status}
            message={status.message}
            details={status.details}
            startTime={status.startTime || 0}
            config={
              agentConfig[status.agent] || {
                color: 'text-muted-foreground',
                bgColor: 'bg-muted/50 border-border',
                icon: <Bot className="w-4 h-4" />,
              }
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
