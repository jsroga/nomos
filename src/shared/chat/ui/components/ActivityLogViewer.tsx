'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { recordFromJson } from '@/shared/data/json-guards'
import type { ActivityLogEntry } from '../../core/types'
import {
  ActivityLogEntryType,
  AgentLogTimeFormat,
  DELEGATION_ELLIPSIS_SUFFIX,
  StatusContentKeyword,
  USING_TOOL_STATUS_PATTERN,
} from '../constants/agent-log'

function formatActivityTime(timestamp: number | undefined): string {
  return new Date(timestamp ?? 0).toLocaleTimeString([], {
    hour12: false,
    hour: AgentLogTimeFormat.TwoDigit,
    minute: AgentLogTimeFormat.TwoDigit,
    second: AgentLogTimeFormat.TwoDigit,
  })
}

function parseToolResult(
  toolResult: ActivityLogEntry['toolResult']
): Record<string, unknown> | null {
  if (typeof toolResult === 'string') {
    try {
      return JSON.parse(toolResult)
    } catch {
      return null
    }
  }
  if (toolResult && typeof toolResult === 'object') {
    return recordFromJson(toolResult)
  }
  return null
}

const ToolActivityDetails: React.FC<{
  entry: ActivityLogEntry
  isRejected: boolean
  rejectionError: string
  resultObj: Record<string, unknown> | null
}> = ({ entry, isRejected, rejectionError, resultObj }) => (
  <>
    {isRejected && rejectionError && (
      <div className="bg-red-950/40 border border-red-500/30 rounded p-2.5 space-y-1">
        <span className="uppercase text-[9px] text-red-400/70 font-bold tracking-wider block">
          Rejection Reason
        </span>
        <p className="text-red-300/90 leading-relaxed whitespace-pre-wrap text-[11px]">
          {rejectionError}
        </p>
      </div>
    )}

    {entry.toolInput != null && !isRejected && (
      <div className="text-xs text-muted-foreground/70 bg-muted/10 p-2 rounded border border-white/5">
        <span className="uppercase text-[9px] opacity-70 block mb-1 tracking-wider">Input</span>
        <span className="font-mono text-purple-300/80 break-words whitespace-pre-wrap">
          {typeof entry.toolInput === 'string'
            ? entry.toolInput
            : JSON.stringify(entry.toolInput, null, 2)}
        </span>
      </div>
    )}

    {!isRejected && entry.toolResult != null && (
      <div className="text-xs bg-black/40 p-2 rounded text-muted-foreground/80 border border-white/5">
        <span className="uppercase text-[9px] opacity-50 block mb-1 tracking-wider">Result</span>
        <pre className="whitespace-pre-wrap text-green-400/80 font-mono text-[10px] max-h-48 overflow-y-auto scrollbar-thin">
          {resultObj ? JSON.stringify(resultObj, null, 2) : String(entry.toolResult).slice(0, 500)}
        </pre>
      </div>
    )}
  </>
)

const ToolActivityEntry: React.FC<{ entry: ActivityLogEntry; time: string }> = ({
  entry,
  time,
}) => {
  const resultObj = parseToolResult(entry.toolResult)
  const isRejected = resultObj?.success === false
  const rejectionError = isRejected ? String(resultObj?.error || '') : ''
  const isSuccess = resultObj?.success === true

  return (
    <div
      className={cn(
        'flex gap-3 text-xs font-mono border-l-2 pl-3 py-2 ml-1 relative group hover:bg-white/5 transition-colors rounded-r',
        isRejected ? 'border-red-500/50' : 'border-purple-500/30'
      )}
    >
      <div
        className={cn(
          'absolute -left-[5px] top-2 w-2 h-2 rounded-full',
          isRejected ? 'bg-red-500/70' : 'bg-purple-500/50'
        )}
      />
      <span className="text-muted-foreground/50 w-16 shrink-0 pt-0.5">{time}</span>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px]',
              isRejected ? 'text-red-400 bg-red-500/10' : 'text-purple-400 bg-purple-500/10'
            )}
          >
            TOOL
          </span>
          <span className="text-foreground/90 font-semibold">{entry.toolName}</span>
          {isRejected && (
            <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-wider">
              ✗ Rejected
            </span>
          )}
          {isSuccess && (
            <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30 uppercase tracking-wider">
              ✓ OK
            </span>
          )}
        </div>

        <ToolActivityDetails
          entry={entry}
          isRejected={isRejected}
          rejectionError={rejectionError}
          resultObj={resultObj}
        />
      </div>
    </div>
  )
}

const ThinkingActivityEntry: React.FC<{ entry: ActivityLogEntry; time: string }> = ({
  entry,
  time,
}) => {
  const preview =
    entry.content?.length && entry.content.length > 200
      ? entry.content.slice(0, 200) + DELEGATION_ELLIPSIS_SUFFIX
      : entry.content

  return (
    <div className="flex gap-3 text-xs font-mono border-l-2 border-amber-500/30 pl-3 py-1 ml-1 transition-colors hover:bg-white/5 rounded-r">
      <span className="opacity-50 w-16 shrink-0">{time}</span>
      <div className="flex-1">
        <span className="font-bold mr-2 uppercase text-[10px] text-amber-500">
          {entry.agent || 'Agent'} Thinking:
        </span>
        <span className="text-amber-100/60 italic">{preview}</span>
      </div>
    </div>
  )
}

const ActionActivityEntry: React.FC<{ entry: ActivityLogEntry; time: string }> = ({
  entry,
  time,
}) => (
  <div className="flex gap-3 text-xs font-mono border-l-2 border-blue-500/30 pl-3 py-2 ml-1 relative hover:bg-white/5 transition-colors rounded-r">
    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-500/50" />
    <span className="text-muted-foreground/50 w-16 shrink-0 pt-0.5">{time}</span>
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">
          ACTION
        </span>
        <span className="text-foreground/90 font-semibold">{entry.content}</span>
      </div>
      {entry.details != null && (
        <div className="text-[10px] text-muted-foreground/60 italic pl-1 border-l-2 border-white/10 ml-1">
          {JSON.stringify(entry.details).slice(0, 150)}...
        </div>
      )}
    </div>
  </div>
)

function isStatusThinking(content: string | undefined): boolean {
  const normalized = content?.toLowerCase() ?? ''
  return (
    normalized.includes(StatusContentKeyword.Thinking) ||
    normalized.includes(StatusContentKeyword.Processing)
  )
}

const StatusActivityBody: React.FC<{ entry: ActivityLogEntry }> = ({ entry }) => {
  const toolMatch = entry.content?.match(USING_TOOL_STATUS_PATTERN)
  if (toolMatch) {
    return (
      <>
        <span className="opacity-70">Using</span>
        <span className="text-purple-300/90 font-semibold">{toolMatch[1]}</span>
        <Loader2 className="w-3 h-3 animate-spin opacity-50" />
      </>
    )
  }
  return entry.content
}

const StatusActivityEntry: React.FC<{ entry: ActivityLogEntry; time: string }> = ({
  entry,
  time,
}) => {
  const isThinking = isStatusThinking(entry.content)

  return (
    <div
      className={cn(
        'flex gap-3 text-xs font-mono border-l-2 pl-3 py-1 ml-1 transition-colors hover:bg-white/5 rounded-r',
        isThinking ? 'border-amber-500/30 text-amber-200/80' : 'border-border/30 text-muted-foreground'
      )}
    >
      <span className="opacity-50 w-16 shrink-0">{time}</span>
      <div className="flex-1 flex items-center gap-2">
        <span
          className={cn(
            'font-bold mr-1 uppercase text-[10px]',
            isThinking ? 'text-amber-500' : 'text-foreground/60'
          )}
        >
          {entry.agent || 'System'}:
        </span>
        <StatusActivityBody entry={entry} />
      </div>
    </div>
  )
}

const ActivityEntryItem: React.FC<{ entry: ActivityLogEntry }> = ({ entry }) => {
  const time = formatActivityTime(entry.timestamp)

  if (entry.type === ActivityLogEntryType.Tool) {
    return <ToolActivityEntry entry={entry} time={time} />
  }
  if (entry.type === ActivityLogEntryType.Thinking) {
    return <ThinkingActivityEntry entry={entry} time={time} />
  }
  if (entry.type === ActivityLogEntryType.Action) {
    return <ActionActivityEntry entry={entry} time={time} />
  }
  if (entry.type === ActivityLogEntryType.Status) {
    return <StatusActivityEntry entry={entry} time={time} />
  }
  return null
}

export const ActivityLogViewer: React.FC<{ logs: ActivityLogEntry[] }> = ({ logs }) => {
  if (!logs || logs.length === 0) return null
  const sorted = [...logs].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))

  return (
    <div className="mt-4 mb-2 pt-2 border-t border-dashed border-border/30">
      <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-2 pl-1 tracking-widest">
        Activity Log
      </div>
      <div className="space-y-2">
        {sorted.map((entry, idx) => (
          <ActivityEntryItem key={idx} entry={entry} />
        ))}
      </div>
    </div>
  )
}
