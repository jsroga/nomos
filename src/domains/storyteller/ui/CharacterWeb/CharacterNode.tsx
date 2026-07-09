'use client'

/**
 * CharacterNode Component
 *
 * Custom node for the Character Web graph.
 * Shows character avatar, name, role, and metrics.
 */

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { cn } from '@/shared/data/utils'
import { User, Users, Crown, MapPin, Calendar, Scroll } from 'lucide-react'
import { CharacterNodeData, CharacterWebNode } from './types'

const TYPE_STYLES: Record<string, { bg: string; border: string; iconBg: string; Icon: any }> = {
  character: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/50',
    iconBg: 'bg-purple-800',
    Icon: User,
  },
  faction: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-700/50',
    iconBg: 'bg-blue-800',
    Icon: Users,
  },
  place: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-700/50',
    iconBg: 'bg-emerald-800',
    Icon: MapPin,
  },
  event: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-700/50',
    iconBg: 'bg-amber-800',
    Icon: Calendar,
  },
  rule: { bg: 'bg-rose-950/80', border: 'border-rose-700/50', iconBg: 'bg-rose-800', Icon: Scroll },
}

const DEFAULT_STYLE = TYPE_STYLES.character

const CharacterNode: React.FC<NodeProps<CharacterWebNode>> = props => {
  const data: CharacterNodeData = props.data ?? { name: 'Unknown', type: 'character' }
  const selected = props.selected

  const name = data.name || 'Unknown'
  const role = data.role
  const avatarUrl = data.avatarUrl
  const type = data.type || 'character'
  const stressLevel = data.stressLevel || 0
  const transformationProgress = data.transformationProgress || 0
  const isHighlighted = data.isHighlighted
  const isCentral = data.isCentral
  const isSelected = data.isSelected

  const style = TYPE_STYLES[type] || DEFAULT_STYLE
  const Icon = style.Icon
  const isCharacter = type === 'character'

  return (
    <>
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-600 !border-zinc-500 !w-2 !h-2"
      />

      {/* Node content */}
      <div
        className={cn(
          'px-3 py-2 rounded-lg border transition-all duration-300',
          'min-w-[120px] max-w-[180px]',
          style.bg,
          style.border,
          selected && 'ring-2 ring-white/50',
          isSelected && 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/40 scale-110',
          isHighlighted &&
            !isSelected &&
            'ring-2 ring-amber-400/70 shadow-lg shadow-amber-500/20 scale-105',
          isCentral && !isSelected && !isHighlighted && 'ring-1 ring-emerald-400/50'
        )}
      >
        {/* Central character indicator */}
        {isCentral && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-0.5">
            <Crown size={12} className="text-white" />
          </div>
        )}

        {/* Avatar and name row */}
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-8 h-8 rounded-full object-cover border border-zinc-600"
            />
          ) : (
            <div
              className={cn('w-8 h-8 rounded-full flex items-center justify-center', style.iconBg)}
            >
              <Icon size={16} className="text-white/80" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-white truncate">{name}</div>
            {role && <div className="text-[10px] text-zinc-400 truncate">{role}</div>}
          </div>
        </div>

        {/* Metrics (only for characters) */}
        {isCharacter && (stressLevel > 0 || transformationProgress > 0) && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1">
            {stressLevel > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500 w-12">Stress</span>
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      stressLevel > 70
                        ? 'bg-red-500'
                        : stressLevel > 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    )}
                    style={{ width: `${stressLevel}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 w-6 text-right">{stressLevel}%</span>
              </div>
            )}

            {transformationProgress > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500 w-12">Arc</span>
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${transformationProgress}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 w-6 text-right">
                  {transformationProgress}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Connected indicator (shown when a neighbor is selected) */}
        {isHighlighted && !isSelected && (
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border border-zinc-900" />
        )}
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-600 !border-zinc-500 !w-2 !h-2"
      />
    </>
  )
}

export default memo(CharacterNode)
