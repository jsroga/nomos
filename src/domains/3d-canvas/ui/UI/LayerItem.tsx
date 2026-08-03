'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { Button } from '@/components/Button'

export interface LayerItemProps {
  id: string
  name: string
  icon?: React.ReactNode
  isSelected: boolean
  onSelect: () => void
  onShiftSelect?: () => void
  onDelete: () => void
}

export const LayerItem: React.FC<LayerItemProps> = ({
  name,
  icon,
  isSelected,
  onSelect,
  onShiftSelect,
  onDelete,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onShiftSelect) {
      onShiftSelect()
    } else {
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 mx-1 my-0.5 rounded-md cursor-pointer group transition-all duration-150',
        isSelected
          ? 'bg-indigo-500/20 border-l-2 border-indigo-500 text-indigo-400 shadow-sm'
          : 'bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground'
      )}
      onClick={handleClick}
    >
      {icon && (
        <div
          className={cn(
            'transition-colors duration-150 flex-shrink-0',
            isSelected ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
          )}
        >
          {icon}
        </div>
      )}

      <span className="text-[11px] font-mono font-medium uppercase tracking-wide flex-1 truncate">
        {name}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 transition-all duration-150 flex-shrink-0',
          isSelected
            ? 'opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        )}
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={11} />
      </Button>
    </div>
  )
}
