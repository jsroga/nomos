'use client'

import React from 'react'
import {
  X,
  User,
  Bot,
  FileText,
  Tv,
  Zap,
  Users,
  Cog,
  RefreshCw,
  GitBranch,
  PenTool,
  Building2,
  Map,
  AlertTriangle,
  FileEdit,
  Layout,
  Scale,
  TrendingUp,
  Scroll,
  Lightbulb,
  Music,
  Shuffle,
  BarChart,
  Gamepad2,
  Database,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MentionItem, MentionCategory, TYPE_ICONS } from '../mentions/types'

// Icon component map
const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Bot,
  FileText,
  Tv,
  Zap,
  Users,
  Cog,
  RefreshCw,
  GitBranch,
  PenTool,
  Building2,
  Map,
  AlertTriangle,
  FileEdit,
  Layout,
  Scale,
  TrendingUp,
  Scroll,
  Lightbulb,
  Music,
  Shuffle,
  BarChart,
  Gamepad2,
  Database,
}

// Category colors
const CATEGORY_COLORS: Record<MentionCategory, string> = {
  entity: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  agent: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  section: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
}

interface MentionChipProps {
  item: MentionItem
  onRemove?: () => void
  size?: 'sm' | 'md'
  showType?: boolean
}

export const MentionChip: React.FC<MentionChipProps> = ({
  item,
  onRemove,
  size = 'sm',
  showType = false,
}) => {
  const iconName = item.icon || TYPE_ICONS[item.type] || 'Database'
  const IconComponent = ICON_MAP[iconName] || Database

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border transition-colors',
        CATEGORY_COLORS[item.category],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <IconComponent className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      <span className="font-medium">@{item.name}</span>
      {showType && <span className="opacity-50 text-[10px] uppercase">{item.type}</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
        </button>
      )}
    </div>
  )
}

interface MentionChipBarProps {
  mentions: MentionItem[]
  onRemove: (id: string) => void
}

export const MentionChipBar: React.FC<MentionChipBarProps> = ({ mentions, onRemove }) => {
  if (mentions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/30 bg-muted/10">
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold self-center mr-1">
        Context
      </span>
      {mentions.map(item => (
        <MentionChip key={item.id} item={item} onRemove={() => onRemove(item.id)} size="sm" />
      ))}
    </div>
  )
}
