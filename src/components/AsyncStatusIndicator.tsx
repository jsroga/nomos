'use client'

import React from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useGlobalStatusStore, OperationType } from '@/store/useGlobalStatusStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const AsyncStatusIndicator: React.FC = () => {
  const operations = useGlobalStatusStore(state => state.operations)

  const pendingOperations = operations.filter(
    op => op.status === 'in-progress' || op.status === 'pending'
  )
  const totalCount = pendingOperations.length
  const isLoading = totalCount > 0

  const getOperationColor = (type: OperationType) => {
    switch (type) {
      case 'world-gen':
        return 'text-yellow-500 bg-yellow-500'
      case '3d-gen':
        return 'text-blue-500 bg-blue-500'
      case 'story-agent':
        return 'text-purple-500 bg-purple-500'
      default:
        return 'text-gray-500 bg-gray-500'
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title={isLoading ? `${totalCount} operation(s) in progress` : 'No active operations'}
          >
            {isLoading ? (
              <Loader2 className="animate-spin text-primary" size={18} />
            ) : (
              <CheckCircle2 className="text-muted-foreground/50" size={18} />
            )}
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {totalCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="bg-card border border-border p-3 min-w-[200px] max-w-[300px]"
        >
          {isLoading ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                {totalCount} operation{totalCount > 1 ? 's' : ''} in progress
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {pendingOperations.map(op => {
                  const colorClass = getOperationColor(op.type)
                  const [textColor, bgColor] = colorClass.split(' ')

                  return (
                    <div key={op.id} className="text-xs flex items-center gap-2 py-1">
                      <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', bgColor)} />
                      <span className={textColor}>{op.label}</span>
                      {op.details && (
                        <span className="text-muted-foreground truncate">{op.details}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active operations</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
