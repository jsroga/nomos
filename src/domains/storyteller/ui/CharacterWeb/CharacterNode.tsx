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
import { Crown } from 'lucide-react'
import { CharacterNodeData, CharacterWebNode } from './types'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { parseEntityType } from '@/domains/storyteller/core/entities/entity-type-guards'
import {
  CHARACTER_NODE_DEFAULT_NAME,
  CHARACTER_NODE_DEFAULT_STYLE,
  CHARACTER_NODE_DEFAULT_TYPE,
  CHARACTER_NODE_TYPE_STYLES,
} from './constants/character-node'
import { CharacterNodeMetrics } from './CharacterNodeMetrics'

const CharacterNode: React.FC<NodeProps<CharacterWebNode>> = props => {
  const data: CharacterNodeData = props.data ?? {
    name: CHARACTER_NODE_DEFAULT_NAME,
    type: CHARACTER_NODE_DEFAULT_TYPE,
  }
  const selected = props.selected

  const name = data.name || CHARACTER_NODE_DEFAULT_NAME
  const role = data.role
  const avatarUrl = data.avatarUrl
  const type = data.type || CHARACTER_NODE_DEFAULT_TYPE
  const stressLevel = data.stressLevel || 0
  const transformationProgress = data.transformationProgress || 0
  const isHighlighted = data.isHighlighted
  const isCentral = data.isCentral
  const isSelected = data.isSelected

  const parsedType = parseEntityType(type)
  const style =
    parsedType !== undefined ? CHARACTER_NODE_TYPE_STYLES[parsedType] : CHARACTER_NODE_DEFAULT_STYLE
  const Icon = style.Icon
  const isCharacter = parsedType === StoryEntityType.Character

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
          <CharacterNodeMetrics
            stressLevel={stressLevel}
            transformationProgress={transformationProgress}
          />
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
