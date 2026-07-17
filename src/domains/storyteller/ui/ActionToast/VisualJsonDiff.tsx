'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { X, Eye } from 'lucide-react'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  ACTION_TOAST_ACTION_PAYLOAD,
  ACTION_TOAST_MANAGE_BEAT,
  ACTION_TOAST_UPDATE_WORLD_BIBLE,
} from '@/domains/storyteller/ui/ActionToast/constants/action-toast-display'

interface DiffData {
  type: string
  changes: unknown
  isPartial: boolean
}

const getDiffData = (action: WireAgentAction): DiffData => {
  if (
    action.type === ActionType.UPDATE_SERIES_BIBLE ||
    action.type === ActionType.UPDATE_WORLD_BIBLE ||
    action.type === ActionType.UPDATE_BIBLE
  ) {
    return { type: ACTION_TOAST_UPDATE_WORLD_BIBLE, changes: action.payload, isPartial: true }
  }

  if (action.type === ActionType.CREATE_BEAT || action.type === ActionType.UPDATE_BEAT) {
    return { type: ACTION_TOAST_MANAGE_BEAT, changes: action.payload, isPartial: false }
  }

  return { type: ACTION_TOAST_ACTION_PAYLOAD, changes: action.payload, isPartial: false }
}

const renderPrimitiveValue = (value: unknown): React.ReactNode => {
  if (value === null) return <span className="text-muted-foreground">null</span>
  if (typeof value === 'boolean') return <span className="text-orange-400">{String(value)}</span>
  if (typeof value === 'number') return <span className="text-cyan-400">{value}</span>
  if (typeof value === 'string') return <span className="text-green-400">"{value}"</span>
  return <span>{String(value)}</span>
}

const renderValue = (_key: string, value: unknown, depth = 0): React.ReactNode => {
  if (value === null || typeof value !== 'object') {
    return renderPrimitiveValue(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>
    return (
      <span>
        <span className="text-muted-foreground">{'['}</span>
        <div className="pl-4 border-l border-border/30 my-1">
          {value.map((item, i) => (
            <div key={i}>
              {renderValue(String(i), item, depth + 1)}
              {i < value.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
        </div>
        <span className="text-muted-foreground">{']'}</span>
      </span>
    )
  }

  const record = recordFromJson(value)
  const keys = Object.keys(record)
  if (keys.length === 0) return <span className="text-muted-foreground">{'{}'}</span>

  return (
    <span>
      <span className="text-muted-foreground">{'{'}</span>
      <div className="pl-4 border-l border-border/30 my-1">
        {keys.map((k, i) => (
          <div key={k} className="flex font-mono text-[10px] leading-relaxed">
            <span className="text-purple-400 mr-1">"{k}":</span>
            {renderValue(k, record[k], depth + 1)}
            {i < keys.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
      </div>
      <span className="text-muted-foreground">{'}'}</span>
    </span>
  )
}

export const VisualJsonDiff: React.FC<{
  action: WireAgentAction
  onClose: () => void
}> = ({ action, onClose }) => {
  const { type, changes, isPartial } = getDiffData(action)

  return (
    <div className="mt-3 rounded border border-blue-500/20 bg-blue-500/5 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Review Changes: {type}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-5 w-5 text-blue-400/60 hover:text-blue-400"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="p-3 overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
        {isPartial && (
          <div className="text-[10px] text-muted-foreground mb-2 italic px-1">
            * Only showing modified fields
          </div>
        )}
        <div className="font-mono text-[10px]">{renderValue('root', changes)}</div>
      </div>
    </div>
  )
}
