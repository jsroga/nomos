'use client'

import React from 'react'
import { STREAMING_TERMINAL_FALLBACK_AGENT } from '@/shared/chat/ui/constants/streaming-terminal'

interface StreamingTerminalProps {
  streamingTokens: string
  thinkingAgent?: string | null
  fallbackAgentLabel?: string
  className?: string
}

export const StreamingTerminal: React.FC<StreamingTerminalProps> = ({
  streamingTokens,
  thinkingAgent,
  fallbackAgentLabel = STREAMING_TERMINAL_FALLBACK_AGENT,
  className,
}) => {
  return (
    <div className={className}>
      <div className="rounded-lg overflow-hidden border border-zinc-700/50 shadow-xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-700/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono ml-2">
            {thinkingAgent || fallbackAgentLabel} — streaming
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider">
              LIVE
            </span>
          </span>
        </div>
        {/* Terminal body */}
        <div className="bg-zinc-950 p-3 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <pre className="m-0 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words text-emerald-400/90">
            {streamingTokens}
            <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 animate-pulse align-middle" />
          </pre>
        </div>
      </div>
    </div>
  )
}
