'use client'

import React from 'react'
import { Command, Database } from 'lucide-react'
import {
  MentionCategory,
  MentionItem,
  CATEGORY_META,
  TYPE_ICONS,
} from '../core/mentions/types'
import { MentionCategoryId } from '../core/constants/mention-types'
import { cn } from '@/shared/data/utils'
import { CHAT_INPUT_ICON_MAP } from './chat-input-icons'

interface ChatInputMentionPopoverProps {
  flatFilteredList: MentionItem[]
  groupedMentions: Record<MentionCategory, MentionItem[]>
  selectedIndex: number
  onSelect: (item: MentionItem) => void
}

function renderCategorySection(
  category: MentionCategory,
  items: MentionItem[],
  groupedMentions: Record<MentionCategory, MentionItem[]>,
  selectedIndex: number,
  onSelect: (item: MentionItem) => void
) {
  if (items.length === 0) return null

  const meta = CATEGORY_META[category]
  const CategoryIcon = CHAT_INPUT_ICON_MAP[meta.icon] || Database

  let indexOffset = 0
  if (category === MentionCategoryId.Agent) indexOffset = groupedMentions.entity.length
  if (category === MentionCategoryId.Section) {
    indexOffset = groupedMentions.entity.length + groupedMentions.agent.length
  }

  return (
    <div key={category}>
      <div className="px-3 py-1.5 bg-muted/20 border-b border-border/30 flex items-center gap-2">
        <CategoryIcon className="w-3 h-3 opacity-50" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
          {meta.label}
        </span>
      </div>
      {items.map((item, idx) => {
        const globalIdx = indexOffset + idx
        const iconName = item.icon || TYPE_ICONS[item.type] || 'Database'
        const ItemIcon = CHAT_INPUT_ICON_MAP[iconName] || Database

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              globalIdx === selectedIndex
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50 text-foreground/80'
            )}
          >
            <div
              className={cn(
                'p-1 rounded',
                category === 'entity' && 'bg-blue-500/10',
                category === 'agent' && 'bg-purple-500/10',
                category === 'section' && 'bg-amber-500/10'
              )}
            >
              <ItemIcon
                className={cn(
                  'w-3 h-3',
                  category === 'entity' && 'text-blue-400',
                  category === 'agent' && 'text-purple-400',
                  category === 'section' && 'text-amber-400'
                )}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium truncate">{item.name}</div>
              <div className="text-[9px] uppercase tracking-tighter opacity-50">
                {item.type}
                {item.preview && ` · ${item.preview}`}
              </div>
            </div>
            {globalIdx === selectedIndex && (
              <div className="text-[10px] opacity-50 font-mono">↵</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ChatInputMentionPopover({
  flatFilteredList,
  groupedMentions,
  selectedIndex,
  onSelect,
}: ChatInputMentionPopoverProps) {
  if (flatFilteredList.length === 0) return null

  return (
    <div className="absolute bottom-full left-4 mb-2 w-72 bg-card border border-border shadow-2xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        <Command className="w-3 h-3" />
        <span>@ Reference</span>
        <span className="ml-auto opacity-50 font-mono">{flatFilteredList.length}</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {renderCategorySection(
          MentionCategoryId.Entity,
          groupedMentions.entity,
          groupedMentions,
          selectedIndex,
          onSelect
        )}
        {renderCategorySection(
          MentionCategoryId.Agent,
          groupedMentions.agent,
          groupedMentions,
          selectedIndex,
          onSelect
        )}
        {renderCategorySection(
          MentionCategoryId.Section,
          groupedMentions.section,
          groupedMentions,
          selectedIndex,
          onSelect
        )}
      </div>
    </div>
  )
}
