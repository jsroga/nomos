import React, { memo } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { cn } from '@/lib/utils'

// Define supported node types
export type LogicNodeType = 'solution' | 'clue' | 'distractor'

export type LogicNodeData = {
  label: string
  type?: LogicNodeType
  subLabel?: string
}

type CustomNode = Node<LogicNodeData>

const variantStyles: Record<
  LogicNodeType,
  { border: string; badge: string; dot: string; label: string }
> = {
  solution: {
    border: 'border-slate-500 hover:border-slate-400',
    badge: 'bg-slate-700/50 text-slate-200',
    dot: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
    label: 'Solution',
  },
  clue: {
    border: 'border-emerald-500/50 hover:border-emerald-400',
    badge: 'bg-emerald-900/30 text-emerald-200',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    label: 'Clue',
  },
  distractor: {
    border: 'border-rose-500/50 hover:border-rose-400',
    badge: 'bg-rose-900/30 text-rose-200',
    dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    label: 'Distractor',
  },
}

export const LogicNode = memo(({ data, selected }: NodeProps<CustomNode>) => {
  const type = data.type || 'solution' // Default to solution if undefined
  const styles = variantStyles[type]

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-lg shadow-xl border bg-card/95 backdrop-blur-sm text-card-foreground transition-all duration-200',
        styles.border,
        selected ? 'ring-2 ring-primary/40 border-primary' : ''
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 rounded-full border-2 border-background transition-colors',
          '!bg-muted-foreground hover:!bg-primary'
        )}
      />

      {/* Header Area */}
      <div
        className={cn(
          'px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2 rounded-t-lg',
          styles.badge
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
          {styles.label}
        </span>
        {/* Status Dot */}
        <div className={cn('h-2 w-2 rounded-full', styles.dot)} />
      </div>

      {/* Content Area */}
      <div className="p-3 flex flex-col gap-1">
        <div className="text-sm font-semibold leading-tight">{data.label}</div>
        {data.subLabel && <div className="text-xs text-muted-foreground">{data.subLabel}</div>}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 rounded-full border-2 border-background transition-colors',
          '!bg-muted-foreground hover:!bg-primary'
        )}
      />
    </div>
  )
})

LogicNode.displayName = 'LogicNode'
