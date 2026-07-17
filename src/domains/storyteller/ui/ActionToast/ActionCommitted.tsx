'use client'

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import type { ActionHistoryEntry } from '@/domains/storyteller/core/types/action-types'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { formatActionForDisplay } from '@/domains/storyteller/core/formatting/action-formatters'

interface ActionCommittedProps {
  entry: ActionHistoryEntry
  compact?: boolean
  onUndo?: () => void
  canUndo?: boolean
}

const formatPayload = (payload: unknown): string => {
  try {
    return JSON.stringify(payload ?? {}, null, 2)
  } catch {
    return String(payload)
  }
}

export const ActionCommitted: React.FC<ActionCommittedProps> = ({
  entry,
  compact = false,
  onUndo,
  canUndo = false,
}) => {
  const [showPreview, setShowPreview] = useState(false)
  const display = formatActionForDisplay(entry.action, ApprovalActionStatus.COMMITTED)
  const payloadText = formatPayload(entry.action.payload)

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <Check className="w-3 h-3" />
          <span className="uppercase tracking-wider text-[10px]">Committed:</span>
          <span>{display.title}</span>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-muted/80 hover:bg-muted text-foreground transition-colors border border-border/50"
          >
            {showPreview ? 'Hide' : 'JSON'}
          </button>
          {canUndo && onUndo && (
            <button
              onClick={onUndo}
              className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors border border-amber-500/30"
            >
              Undo
            </button>
          )}
        </div>
        {showPreview && (
          <div className="mt-1 p-2 rounded bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
            <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[200px] overflow-y-auto">
              {payloadText}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-2.5 my-2">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">
              Committed
            </span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-muted/80 hover:bg-muted text-foreground transition-colors border border-border/50"
            >
              {showPreview ? 'Hide JSON' : 'Preview JSON'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium text-foreground">{display.title}</span>
          </div>
          {display.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{display.description}</p>
          )}
        </div>
      </div>
      {showPreview && (
        <div className="mt-2 p-2 rounded bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
          <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto">
            {payloadText}
          </pre>
        </div>
      )}
    </div>
  )
}
