'use client'

import React from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
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
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  // Trigger.dev active statuses
  const ACTIVE_STATUSES = ['PENDING', 'QUEUED', 'EXECUTING', 'WAITING', 'REATTEMPTING', 'FROZEN', 'PENDING_VERSION', 'DEQUEUED', 'DELAYED']

  // Clear all stale operations manually
  const clearAllOperations = React.useCallback(() => {
    const currentOps = useGlobalStatusStore.getState().operations
    currentOps.forEach(op => {
      if (op.status === 'in-progress' || op.status === 'pending') {
        removeOperation(op.id)
      }
    })
  }, [removeOperation])

  // Auto-cleanup stuck operations on mount (with delay for zustand rehydration)
  React.useEffect(() => {
    const cleanupStuckOperations = async () => {
      // Get fresh operations from store (not closure)
      const currentOps = useGlobalStatusStore.getState().operations
      const stuckOps = currentOps.filter(
        op => op.status === 'in-progress' || op.status === 'pending'
      )

      if (stuckOps.length === 0) return

      console.log(`[AsyncStatusIndicator] Found ${stuckOps.length} potentially stuck operations, checking...`)

      for (const operation of stuckOps) {
        try {
          // Handle different operation types
          if (operation.type === 'retexture') {
            await cleanupRetextureOperation(operation)
          } else if (operation.type === '3d-gen' || operation.type === '3d-remesh') {
            await cleanup3DOperation(operation)
          } else if (operation.type === 'story-agent') {
            // Story agent operations are transient - if page reloads, they're stale
            console.log(`[AsyncStatusIndicator] Removing stale story-agent operation ${operation.id}`)
            removeOperation(operation.id)
          } else if (operation.type === 'portrait-gen') {
            await cleanupPortraitOperation(operation)
          } else if (operation.type === 'world-gen') {
            // World-gen operations are transient - remove on reload
            console.log(`[AsyncStatusIndicator] Removing stale world-gen operation ${operation.id}`)
            removeOperation(operation.id)
          }
        } catch (err) {
          console.error(`[AsyncStatusIndicator] Error checking operation ${operation.id}:`, err)
        }
      }
    }

    // Cleanup helper for retexture operations
    const cleanupRetextureOperation = async (operation: typeof operations[0]) => {
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || '{}')
        taskId = metadata.taskId
      } catch (e) {
        console.error(`[AsyncStatusIndicator] Failed to parse metadata for ${operation.id}`)
        return
      }

      if (!taskId) {
        removeOperation(operation.id)
        return
      }

      console.log(`[AsyncStatusIndicator] Checking retexture ${operation.id} with taskId ${taskId}`)

      const res = await fetch(`/api/interior-designer/retexture/${taskId}`)

      if (!res.ok) {
        console.warn(`[AsyncStatusIndicator] Task ${taskId} not found, marking as failed`)
        updateOperation(operation.id, {
          status: 'failed',
          details: JSON.stringify({ taskId, error: 'Task not found', failureStatus: 'NOT_FOUND' })
        })
        return
      }

      const data = await res.json()
      console.log(`[AsyncStatusIndicator] Task ${taskId} status:`, data.status)

      if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
        const output = data.output
        if (output && output.success) {
          updateOperation(operation.id, {
            status: 'completed',
            details: JSON.stringify({
              taskId,
              retexturedUrl: output.retexturedUrl
            })
          })
          console.log(`[AsyncStatusIndicator] Updated ${operation.id} to completed`)
        }
      } else if (!ACTIVE_STATUSES.includes(data.status)) {
        updateOperation(operation.id, {
          status: 'failed',
          details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status })
        })
        console.log(`[AsyncStatusIndicator] Updated ${operation.id} to failed (${data.status})`)
      }
    }

    // Cleanup helper for 3D generation/remesh operations
    const cleanup3DOperation = async (operation: typeof operations[0]) => {
      // Extract runId from operation id (format: 3d-{assetId} or 3d-remesh-{assetId})
      // The actual runId should be stored in metadata
      let runId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || '{}')
        runId = metadata.runId || metadata.taskId
      } catch (e) {
        // If no metadata, operation is likely stale
        console.log(`[AsyncStatusIndicator] No metadata for 3D op ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      if (!runId) {
        // No runId means we can't check status - remove as stale
        console.log(`[AsyncStatusIndicator] No runId for 3D op ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      console.log(`[AsyncStatusIndicator] Checking 3D operation ${operation.id} with runId ${runId}`)

      try {
        const res = await fetch(`/api/trigger-3d/status?runId=${runId}`)

        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`[AsyncStatusIndicator] 3D task ${runId} not found, removing`)
            removeOperation(operation.id)
          }
          return
        }

        const data = await res.json()
        console.log(`[AsyncStatusIndicator] 3D task ${runId} status:`, data.status)

        if (data.status === 'COMPLETED') {
          // Let the component that started the operation handle completion
          // Just remove from indicator if completed
          removeOperation(operation.id)
        } else if (!ACTIVE_STATUSES.includes(data.status)) {
          // Failed or terminal state
          removeOperation(operation.id)
        }
      } catch (err) {
        console.error(`[AsyncStatusIndicator] Error checking 3D operation:`, err)
        // On error, remove stale operation
        removeOperation(operation.id)
      }
    }

    // Cleanup helper for portrait generation operations
    const cleanupPortraitOperation = async (operation: typeof operations[0]) => {
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || '{}')
        taskId = metadata.taskId || metadata.runId
      } catch (e) {
        console.log(`[AsyncStatusIndicator] No metadata for portrait op ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      if (!taskId) {
        removeOperation(operation.id)
        return
      }

      console.log(`[AsyncStatusIndicator] Checking portrait operation ${operation.id} with taskId ${taskId}`)

      try {
        const res = await fetch(`/api/storyteller/generate-portrait/status?taskId=${taskId}`)

        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`[AsyncStatusIndicator] Portrait task ${taskId} not found, removing`)
            removeOperation(operation.id)
          }
          return
        }

        const data = await res.json()

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          removeOperation(operation.id)
        } else if (!ACTIVE_STATUSES.includes(data.status)) {
          removeOperation(operation.id)
        }
      } catch (err) {
        console.error(`[AsyncStatusIndicator] Error checking portrait operation:`, err)
        removeOperation(operation.id)
      }
    }

    // Delay cleanup to allow zustand to rehydrate from localStorage
    const timeoutId = setTimeout(() => {
      cleanupStuckOperations()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [removeOperation, updateOperation]) // Include deps for cleanup functions

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
      case '3d-remesh':
        return 'text-cyan-500 bg-cyan-500'
      case 'story-agent':
        return 'text-purple-500 bg-purple-500'
      case 'portrait-gen':
        return 'text-pink-500 bg-pink-500'
      case 'retexture':
        return 'text-violet-500 bg-violet-500'
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

                  // Format details nicely instead of showing raw JSON
                  let statusText = 'In progress'
                  if (op.details) {
                    try {
                      const metadata = JSON.parse(op.details)
                      // Show prompt if available, otherwise just generic status
                      if (metadata.prompt) {
                        statusText = metadata.prompt.length > 30
                          ? metadata.prompt.substring(0, 30) + '...'
                          : metadata.prompt
                      }
                    } catch (e) {
                      // If JSON parsing fails, treat as plain text
                      statusText = op.details.length > 30
                        ? op.details.substring(0, 30) + '...'
                        : op.details
                    }
                  }

                  return (
                    <div key={op.id} className="text-xs py-1 group/op">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', bgColor)} />
                        <span className={cn('font-medium flex-1', textColor)}>{op.label}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeOperation(op.id)
                          }}
                          className="opacity-0 group-hover/op:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity"
                          title="Dismiss"
                        >
                          <XCircle size={12} className="text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="text-muted-foreground text-[11px] ml-3.5 truncate">
                        {statusText}
                      </div>
                    </div>
                  )
                })}
              </div>
              {totalCount > 0 && (
                <button
                  onClick={clearAllOperations}
                  className="w-full mt-2 pt-2 border-t border-border text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle size={12} />
                  Clear all stale operations
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active operations</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
