'use client'

import React from 'react'
import { Bot, Check, Loader2 } from 'lucide-react'
import type { AgentConfig, AgentConfigMap, ThinkingMessagesConfig } from '../../core/types'
import { getThinkingMessage } from '../../core/types'
import { AGENT_LOG_DEFAULT_COLOR } from '../constants/agent-log'
import { getAgentDisplayName } from '../utils/agent-log-message-helpers'
import { resolveAgentConfig } from '../utils/agent-log-group-types'

type ActiveOperation = {
  id: string
  type: string
  label: string
  startTime?: number
  tool?: string
}

interface AgentLogStatusFooterProps {
  isSending: boolean
  hasProcessed: boolean
  isActivityPanelOpen: boolean
  currentPhase?: string
  activeOperations: ActiveOperation[]
  streamingTokens?: string
  currentAgent: string | null
  agentConfig: AgentConfigMap
  thinkingMessagesConfig: ThinkingMessagesConfig
  thinkingTime: number
}

function resolveFooterAgentConfig(
  agentName: string,
  agentConfig: AgentConfigMap
): AgentConfig {
  return (
    resolveAgentConfig(agentName, agentConfig) ?? {
      color: AGENT_LOG_DEFAULT_COLOR,
      bgColor: 'bg-muted/10 border-border/20',
      icon: <Bot className="w-3.5 h-3.5" />,
    }
  )
}

const ActivityDetailsPanel: React.FC<{
  currentPhase?: string
  activeOperations: ActiveOperation[]
}> = ({ currentPhase, activeOperations }) => (
  <div className="mb-3 space-y-2">
    <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md border border-border/30">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {currentPhase || 'Processing'}
        </span>
      </div>
      {activeOperations.length > 0 && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground/80 truncate max-w-[200px]">
            {activeOperations.map(op => op.label).join(', ')}
          </span>
        </div>
      )}
    </div>

    {activeOperations.length > 0 && (
      <div className="space-y-1 pl-2 border-l-2 border-primary/30">
        {activeOperations.map(op => (
          <div key={op.id} className="flex items-center gap-2 text-[10px] py-1">
            <Loader2 className="w-3 h-3 animate-spin text-primary/70" />
            <span className="text-foreground/80 font-medium">{op.label}</span>
            {op.tool && (
              <span className="text-muted-foreground font-mono text-[9px]">→ {op.tool}</span>
            )}
            {op.startTime && (
              <span className="text-muted-foreground/60 ml-auto font-mono text-[9px]">
                {Math.round((Date.now() - op.startTime) / 1000)}s
              </span>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)

const LiveStreamPanel: React.FC<{ streamingTokens: string }> = ({ streamingTokens }) => (
  <div className="mb-2 p-3 rounded-md bg-black/90 border border-green-500/30 text-[10px] font-mono shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-center gap-2 mb-1.5 border-b border-white/10 pb-1">
      <span className="text-green-500 font-bold uppercase tracking-widest animate-pulse">
        ● Live Stream
      </span>
      <span className="ml-auto text-muted-foreground/50">
        {(streamingTokens.length / 1024).toFixed(1)}kb
      </span>
    </div>
    <div className="text-green-400/90 whitespace-pre-wrap break-words leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50 scrollbar-track-transparent">
      {streamingTokens}
      <span className="inline-block w-1.5 h-3 ml-0.5 bg-green-500 animate-pulse align-middle" />
    </div>
  </div>
)

const CurrentAgentIndicator: React.FC<{
  currentAgent: string
  agentConfig: AgentConfigMap
  thinkingMessagesConfig: ThinkingMessagesConfig
  thinkingTime: number
}> = ({ currentAgent, agentConfig, thinkingMessagesConfig, thinkingTime }) => {
  const config = resolveFooterAgentConfig(currentAgent, agentConfig)

  return (
    <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg px-3 py-2 shadow-sm flex-1">
        <div className="relative">
          {config.icon}
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-ping" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-primary uppercase tracking-wider">
            {getAgentDisplayName(currentAgent)}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium">
            {getThinkingMessage(thinkingMessagesConfig, thinkingTime, true)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground">{thinkingTime}s</span>
        </div>
      </div>
    </div>
  )
}

export const AgentLogStatusFooter: React.FC<AgentLogStatusFooterProps> = ({
  isSending,
  hasProcessed,
  isActivityPanelOpen,
  currentPhase,
  activeOperations,
  streamingTokens,
  currentAgent,
  agentConfig,
  thinkingMessagesConfig,
  thinkingTime,
}) => (
  <div className="mt-4 border-t border-border/10 pt-3 px-2">
    {isSending ? (
      <div className="space-y-2">
        {isActivityPanelOpen && (
          <ActivityDetailsPanel
            currentPhase={currentPhase}
            activeOperations={activeOperations}
          />
        )}

        {isActivityPanelOpen && streamingTokens && (
          <LiveStreamPanel streamingTokens={streamingTokens} />
        )}

        {currentAgent ? (
          <CurrentAgentIndicator
            currentAgent={currentAgent}
            agentConfig={agentConfig}
            thinkingMessagesConfig={thinkingMessagesConfig}
            thinkingTime={thinkingTime}
          />
        ) : (
          <div className="flex items-center gap-2 text-primary/70 text-[10px] uppercase tracking-widest font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{getThinkingMessage(thinkingMessagesConfig, thinkingTime, false)}</span>
          </div>
        )}
      </div>
    ) : hasProcessed && isActivityPanelOpen ? (
      <div className="flex items-center gap-2 text-green-500/60 text-[10px] uppercase tracking-widest font-medium animate-in fade-in slide-in-from-bottom-1 duration-500">
        <div className="relative">
          <Check className="w-3 h-3" />
          <div className="absolute inset-0 bg-green-500/30 blur-sm animate-pulse" />
        </div>
        <span>{thinkingMessagesConfig.completeMessage}</span>
      </div>
    ) : null}
  </div>
)
