'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { cn } from '@/shared/data/utils'

import {
  ICON_BUTTON_DEFAULT_SIZE,
  ICON_BUTTON_DEFAULT_VARIANT,
  ICON_BUTTON_SIZE_CLASSES,
} from './constants/icon-button-styles'

interface IconButtonProps {
  icon: React.ReactNode
  onClick: () => void
  tooltip?: string
  disabled?: boolean
  isActive?: boolean
  isLoading?: boolean
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

/**
 * Consistent icon button with optional tooltip
 * Follows the world-gen styling pattern
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  tooltip,
  disabled = false,
  isActive = false,
  isLoading = false,
  variant = ICON_BUTTON_DEFAULT_VARIANT,
  size = ICON_BUTTON_DEFAULT_SIZE,
  className,
}) => {
  const sizeClasses = ICON_BUTTON_SIZE_CLASSES

  const button = (
    <Button
      variant={isActive ? 'default' : variant}
      size="icon"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        sizeClasses[size],
        'transition-all duration-200',
        isActive &&
          'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_12px_rgba(79,70,229,0.35)]',
        !isActive &&
          variant === 'ghost' &&
          'text-muted-foreground hover:text-foreground hover:bg-white/10',
        className
      )}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}
