'use client'

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
import { getCharacterNodeClasses } from './character-node-styles'

const CharacterNodeAvatar: React.FC<{
  avatarUrl?: string
  name: string
  iconBg: string
  Icon: React.ComponentType<{ size: number; className?: string }>
}> = ({ avatarUrl, name, iconBg, Icon }) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-zinc-600"
      />
    )
  }

  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', iconBg)}>
      <Icon size={16} className="text-white/80" />
    </div>
  )
}

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
  const showMetrics = isCharacter && (stressLevel > 0 || transformationProgress > 0)

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-600 !border-zinc-500 !w-2 !h-2"
      />

      <div
        className={getCharacterNodeClasses({
          selected,
          isSelected,
          isHighlighted,
          isCentral,
          styleBg: style.bg,
          styleBorder: style.border,
        })}
      >
        {isCentral && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-0.5">
            <Crown size={12} className="text-white" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <CharacterNodeAvatar
            avatarUrl={avatarUrl}
            name={name}
            iconBg={style.iconBg}
            Icon={Icon}
          />

          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-white truncate">{name}</div>
            {role && <div className="text-[10px] text-zinc-400 truncate">{role}</div>}
          </div>
        </div>

        {showMetrics && (
          <CharacterNodeMetrics
            stressLevel={stressLevel}
            transformationProgress={transformationProgress}
          />
        )}

        {isHighlighted && !isSelected && (
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border border-zinc-900" />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-600 !border-zinc-500 !w-2 !h-2"
      />
    </>
  )
}

export default memo(CharacterNode)
