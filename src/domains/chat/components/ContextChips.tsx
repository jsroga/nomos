'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { User, BookOpen, Globe, Users, FileText, Sparkles, X } from 'lucide-react'

export interface ContextItem {
  id: string
  type: 'character' | 'world_rule' | 'faction' | 'episode' | 'beat' | 'document'
  name: string
  onClick?: () => void
  onRemove?: () => void
}

interface ContextChipsProps {
  items: ContextItem[]
  label?: string
  className?: string
  compact?: boolean
}

// Icons for different context types
const CONTEXT_ICONS: Record<ContextItem['type'], React.ReactNode> = {
  character: <User className="w-3 h-3" />,
  world_rule: <BookOpen className="w-3 h-3" />,
  faction: <Users className="w-3 h-3" />,
  episode: <FileText className="w-3 h-3" />,
  beat: <Sparkles className="w-3 h-3" />,
  document: <Globe className="w-3 h-3" />,
}

// Colors for different context types  
const CONTEXT_COLORS: Record<ContextItem['type'], string> = {
  character: 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20',
  world_rule: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
  faction: 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20',
  episode: 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20',
  beat: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20',
  document: 'bg-gray-500/10 border-gray-500/30 text-gray-400 hover:bg-gray-500/20',
}

export const ContextChips: React.FC<ContextChipsProps> = ({
  items,
  label = 'Using:',
  className,
  compact = false,
}) => {
  if (items.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {label && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">
          {label}
        </span>
      )}
      {items.map((item) => (
        <ContextChip key={item.id} item={item} compact={compact} />
      ))}
    </div>
  )
}

// Individual context chip
const ContextChip: React.FC<{ item: ContextItem; compact?: boolean }> = ({ item, compact }) => {
  const icon = CONTEXT_ICONS[item.type]
  const colorClass = CONTEXT_COLORS[item.type]

  return (
    <button
      onClick={item.onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border transition-colors',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        colorClass,
        item.onClick && 'cursor-pointer',
        !item.onClick && 'cursor-default'
      )}
    >
      {icon}
      <span className="font-medium truncate max-w-[100px]">{item.name}</span>
      {item.onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            item.onRemove?.()
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/20 transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </button>
  )
}

// Helper to extract context items from message content
export const extractContextFromMessage = (content: string, availableContext: {
  characters?: Array<{ id: string; name: string }>
  worldRules?: Array<{ id: string; name: string }>
  factions?: Array<{ id: string; name: string }>
}): ContextItem[] => {
  const items: ContextItem[] = []
  const contentLower = content.toLowerCase()

  // Check for character mentions
  availableContext.characters?.forEach(char => {
    if (contentLower.includes(char.name.toLowerCase())) {
      items.push({
        id: char.id,
        type: 'character',
        name: char.name,
      })
    }
  })

  // Check for world rule mentions
  availableContext.worldRules?.forEach(rule => {
    if (contentLower.includes(rule.name.toLowerCase())) {
      items.push({
        id: rule.id,
        type: 'world_rule',
        name: rule.name,
      })
    }
  })

  // Check for faction mentions
  availableContext.factions?.forEach(faction => {
    if (contentLower.includes(faction.name.toLowerCase())) {
      items.push({
        id: faction.id,
        type: 'faction',
        name: faction.name,
      })
    }
  })

  return items
}

// Preset context bar for showing what's being used
interface ContextBarProps {
  characters?: Array<{ id: string; name: string }>
  worldRules?: Array<{ id: string; name: string }>
  episode?: { id: string; title: string }
  className?: string
}

export const ContextBar: React.FC<ContextBarProps> = ({
  characters = [],
  worldRules = [],
  episode,
  className,
}) => {
  const items: ContextItem[] = []

  // Add episode if present
  if (episode) {
    items.push({
      id: episode.id,
      type: 'episode',
      name: episode.title,
    })
  }

  // Add first few characters
  characters.slice(0, 3).forEach(char => {
    items.push({
      id: char.id,
      type: 'character',
      name: char.name,
    })
  })

  // Add first few world rules
  worldRules.slice(0, 2).forEach(rule => {
    items.push({
      id: rule.id,
      type: 'world_rule',
      name: rule.name,
    })
  })

  if (items.length === 0) return null

  return (
    <div className={cn('px-3 py-1.5 bg-muted/30 border-b border-border/30', className)}>
      <ContextChips items={items} label="Context:" compact />
    </div>
  )
}

export default ContextChips

