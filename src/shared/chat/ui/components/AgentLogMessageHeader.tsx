'use client'

import React from 'react'
import { User } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import type { AgentConfig, Message } from '../../core/types'

interface AgentLogMessageHeaderProps {
  msg: Message
  isHuman: boolean
  displayName: string
  config: AgentConfig
  isActivityPanelOpen: boolean
}

export const AgentLogMessageHeader: React.FC<AgentLogMessageHeaderProps> = ({
  msg,
  isHuman,
  displayName,
  config,
  isActivityPanelOpen,
}) => (
  <div
    className={cn(
      'flex items-center gap-2 mb-1.5',
      isHuman ? 'justify-end text-primary' : config.color
    )}
  >
    {!isHuman && (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-300',
          config.bgColor || 'bg-muted/30 border border-border/20'
        )}
      >
        <div className="p-0.5 opacity-90">{config.icon}</div>
        <span className="font-bold text-[10px] uppercase tracking-[0.15em]">{displayName}</span>
      </div>
    )}
    {isHuman && (
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
        <span className="font-bold text-[10px] uppercase tracking-[0.15em]">You</span>
        <div className="p-0.5 opacity-90">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    )}

    {!isHuman && msg.confidence !== undefined && isActivityPanelOpen && (
      <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
        {Math.round(msg.confidence * 100)}%
      </span>
    )}
  </div>
)
