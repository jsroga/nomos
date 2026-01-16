'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useErrorStore } from '@/store/useErrorStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export const TroubleshootIndicator: React.FC = () => {
  const errors = useErrorStore(state => state.errors)
  const hasUnviewedErrors = useErrorStore(state => state.hasUnviewedErrors)
  const togglePanel = useErrorStore(state => state.togglePanel)

  const errorCount = errors.length
  const hasErrors = errorCount > 0 && hasUnviewedErrors

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={togglePanel}
            title={hasErrors ? `${errorCount} error(s) occurred` : 'No errors'}
          >
            <AlertTriangle
              className={cn(
                'transition-colors',
                hasErrors ? 'text-red-500' : 'text-muted-foreground/50'
              )}
              size={18}
            />
            {hasErrors && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {errorCount > 9 ? '9+' : errorCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="z-[200]">
          <span className="text-sm">
            {hasErrors ? `${errorCount} error(s) - click to view` : 'Troubleshoot'}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
