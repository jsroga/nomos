'use client'

import React from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useGlobalStatusStore, type OperationType } from '@/shared/jobs/useGlobalStatusStore'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import {
  TRIGGER_ACTIVE_STATUSES,
  TriggerTerminalStatus,
} from '@/shared/jobs/constants/trigger-active-status'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { LiquidGlass } from '@/components/LiquidGlass'
import {
  ASYNC_STATUS_EMPTY_METADATA,
  ASYNC_STATUS_FAILURE_STATUS,
  AsyncStatusIndicatorLog,
  AsyncStatusIndicatorUiCopy,
  AsyncStatusTaskError,
  DEFAULT_OPERATION_COLOR,
  OPERATION_TYPE_COLORS,
} from './constants/async-status-indicator'

export const AsyncStatusIndicator: React.FC = () => {
  const operations = useGlobalStatusStore(state => state.operations)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  // Clear all stale operations manually
  const clearAllOperations = React.useCallback(() => {
    const currentOps = useGlobalStatusStore.getState().operations
    currentOps.forEach(op => {
      if (
        op.status === AsyncOperationStatus.InProgress ||
        op.status === AsyncOperationStatus.Pending
      ) {
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
        op =>
          op.status === AsyncOperationStatus.InProgress ||
          op.status === AsyncOperationStatus.Pending
      )

      if (stuckOps.length === 0) return

      console.log(
        `${AsyncStatusIndicatorLog.FoundStuckOperations} ${stuckOps.length} potentially stuck operations, checking...`
      )

      for (const operation of stuckOps) {
        try {
          // Handle different operation types
          if (operation.type === OperationTypeId.Retexture) {
            await cleanupRetextureOperation(operation)
          } else if (
            operation.type === OperationTypeId.ThreeDGen ||
            operation.type === OperationTypeId.ThreeDRemesh
          ) {
            await cleanup3DOperation(operation)
          } else if (operation.type === OperationTypeId.StoryAgent) {
            // Story agent operations are transient - if page reloads, they're stale
            console.log(
              `${AsyncStatusIndicatorLog.RemovingStaleStoryAgent} ${operation.id}`
            )
            removeOperation(operation.id)
          } else if (operation.type === OperationTypeId.PortraitGen) {
            await cleanupPortraitOperation(operation)
          } else if (operation.type === OperationTypeId.WorldGen) {
            // World-gen operations are transient - remove on reload
            console.log(`${AsyncStatusIndicatorLog.RemovingStaleWorldGen} ${operation.id}`)
            removeOperation(operation.id)
          }
        } catch (err) {
          console.error(`${AsyncStatusIndicatorLog.ErrorCheckingOperation} ${operation.id}:`, err)
        }
      }
    }

    // Cleanup helper for retexture operations
    const cleanupRetextureOperation = async (operation: (typeof operations)[0]) => {
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || ASYNC_STATUS_EMPTY_METADATA)
        taskId = metadata.taskId
      } catch (_e) {
        console.error(`${AsyncStatusIndicatorLog.FailedParseMetadata} ${operation.id}`)
        return
      }

      if (!taskId) {
        removeOperation(operation.id)
        return
      }

      console.log(`${AsyncStatusIndicatorLog.CheckingRetexture} ${operation.id} with taskId ${taskId}`)

      const res = await fetch(`/api/interior-designer/retexture/${taskId}`)

      if (!res.ok) {
        console.warn(`${AsyncStatusIndicatorLog.TaskNotFound} ${taskId} not found, marking as failed`)
        updateOperation(operation.id, {
          status: AsyncOperationStatus.Failed,
          details: JSON.stringify({
            taskId,
            error: AsyncStatusTaskError.TaskNotFound,
            failureStatus: ASYNC_STATUS_FAILURE_STATUS,
          }),
        })
        return
      }

      const data = await res.json()
      console.log(`${AsyncStatusIndicatorLog.TaskStatus} ${taskId} status:`, data.status)

      if (
        data.status === TriggerTerminalStatus.Completed ||
        data.status === TriggerTerminalStatus.Success
      ) {
        const output = data.output
        if (output && output.success) {
          updateOperation(operation.id, {
            status: AsyncOperationStatus.Completed,
            details: JSON.stringify({
              taskId,
              retexturedUrl: output.retexturedUrl,
            }),
          })
          console.log(`${AsyncStatusIndicatorLog.UpdatedCompleted} ${operation.id} to completed`)
        }
      } else if (!TRIGGER_ACTIVE_STATUSES.includes(data.status)) {
        updateOperation(operation.id, {
          status: AsyncOperationStatus.Failed,
          details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status }),
        })
        console.log(`${AsyncStatusIndicatorLog.UpdatedFailed} ${operation.id} to failed (${data.status})`)
      }
    }

    // Cleanup helper for 3D generation/remesh operations
    const cleanup3DOperation = async (operation: (typeof operations)[0]) => {
      // Extract runId from operation id (format: 3d-{assetId} or 3d-remesh-{assetId})
      // The actual runId should be stored in metadata
      let runId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || ASYNC_STATUS_EMPTY_METADATA)
        runId = metadata.runId || metadata.taskId
      } catch (_e) {
        // If no metadata, operation is likely stale
        console.log(`${AsyncStatusIndicatorLog.NoMetadata3d} ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      if (!runId) {
        // No runId means we can't check status - remove as stale
        console.log(`${AsyncStatusIndicatorLog.NoRunId3d} ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      console.log(`${AsyncStatusIndicatorLog.Checking3d} ${operation.id} with runId ${runId}`)

      try {
        const res = await fetch(`/api/trigger-3d/status?runId=${runId}`)

        if (!res.ok) {
          if (res.status === HttpStatus.NOT_FOUND) {
            console.warn(`${AsyncStatusIndicatorLog.ThreeDNotFound} ${runId} not found, removing`)
            removeOperation(operation.id)
          }
          return
        }

        const data = await res.json()
        console.log(`${AsyncStatusIndicatorLog.ThreeDStatus} ${runId} status:`, data.status)

        if (data.status === TriggerTerminalStatus.Completed) {
          // Let the component that started the operation handle completion
          // Just remove from indicator if completed
          removeOperation(operation.id)
        } else if (!TRIGGER_ACTIVE_STATUSES.includes(data.status)) {
          // Failed or terminal state
          removeOperation(operation.id)
        }
      } catch (err) {
        console.error(AsyncStatusIndicatorLog.ErrorChecking3d, err)
        // On error, remove stale operation
        removeOperation(operation.id)
      }
    }

    // Cleanup helper for portrait generation operations
    const cleanupPortraitOperation = async (operation: (typeof operations)[0]) => {
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(operation.details || ASYNC_STATUS_EMPTY_METADATA)
        taskId = metadata.taskId || metadata.runId
      } catch (_e) {
        console.log(`${AsyncStatusIndicatorLog.NoMetadataPortrait} ${operation.id}, removing`)
        removeOperation(operation.id)
        return
      }

      if (!taskId) {
        removeOperation(operation.id)
        return
      }

      console.log(`${AsyncStatusIndicatorLog.CheckingPortrait} ${operation.id} with taskId ${taskId}`)

      try {
        const res = await fetch(`/api/storyteller/generate-portrait/status?taskId=${taskId}`)

        if (!res.ok) {
          if (res.status === HttpStatus.NOT_FOUND) {
            console.warn(`${AsyncStatusIndicatorLog.PortraitNotFound} ${taskId} not found, removing`)
            removeOperation(operation.id)
          }
          return
        }

        const data = await res.json()

        if (
          data.status === TriggerTerminalStatus.Completed ||
          data.status === TriggerTerminalStatus.Success
        ) {
          removeOperation(operation.id)
        } else if (!TRIGGER_ACTIVE_STATUSES.includes(data.status)) {
          removeOperation(operation.id)
        }
      } catch (err) {
        console.error(AsyncStatusIndicatorLog.ErrorCheckingPortrait, err)
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
    op =>
      op.status === AsyncOperationStatus.InProgress || op.status === AsyncOperationStatus.Pending
  )
  const totalCount = pendingOperations.length
  const isLoading = totalCount > 0

  const getOperationColor = (type: OperationType): string => {
    switch (type) {
      case OperationTypeId.WorldGen:
        return OPERATION_TYPE_COLORS[OperationTypeId.WorldGen]
      case OperationTypeId.ThreeDGen:
        return OPERATION_TYPE_COLORS[OperationTypeId.ThreeDGen]
      case OperationTypeId.ThreeDRemesh:
        return OPERATION_TYPE_COLORS[OperationTypeId.ThreeDRemesh]
      case OperationTypeId.StoryAgent:
        return OPERATION_TYPE_COLORS[OperationTypeId.StoryAgent]
      case OperationTypeId.PortraitGen:
        return OPERATION_TYPE_COLORS[OperationTypeId.PortraitGen]
      case OperationTypeId.Retexture:
        return OPERATION_TYPE_COLORS[OperationTypeId.Retexture]
      default:
        return DEFAULT_OPERATION_COLOR
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
          className="p-0 border-none bg-transparent min-w-[300px] max-w-[400px] rounded-xl shadow-2xl z-[200]"
        >
          <div className="rounded-xl border border-white/20">
            <div className="overflow-hidden rounded-xl">
            <LiquidGlass className="w-full rounded-xl">
            <div className="bg-background/40 backdrop-blur-xl p-4">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <Loader2 size={16} className="text-primary animate-spin" />
                    {totalCount} operation{totalCount > 1 ? 's' : ''} in progress
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {pendingOperations.map(op => {
                      const colorClass = getOperationColor(op.type)
                      const [textColor, bgColor] = colorClass.split(' ')

                      // Format details nicely instead of showing raw JSON
                      let statusText: string = AsyncStatusIndicatorUiCopy.InProgress
                      if (op.details) {
                        try {
                          const metadata = JSON.parse(op.details)
                          // Show prompt if available, otherwise just generic status
                          if (metadata.prompt) {
                            statusText =
                              metadata.prompt.length > 40
                                ? metadata.prompt.substring(0, 40) + '...'
                                : metadata.prompt
                          }
                        } catch (e) {
                          // If JSON parsing fails, treat as plain text
                          statusText =
                            op.details.length > 40
                              ? op.details.substring(0, 40) + '...'
                              : op.details
                        }
                      }

                      return (
                        <div
                          key={op.id}
                          className="text-xs py-2 px-3 rounded-lg bg-black/20 group/op border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={cn(
                                'w-1.5 h-1.5 rounded-full animate-pulse shadow-glow',
                                bgColor
                              )}
                            />
                            <span className={cn('font-medium flex-1 tracking-wide', textColor)}>
                              {op.label}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                removeOperation(op.id)
                              }}
                              className="opacity-0 group-hover/op:opacity-100 p-1 hover:bg-white/10 rounded-full transition-all"
                              title={AsyncStatusIndicatorUiCopy.Dismiss}
                            >
                              <XCircle size={14} className="text-white/40 hover:text-red-400" />
                            </button>
                          </div>
                          <div className="text-white/60 text-[11px] truncate pl-3.5 border-l border-white/10 ml-0.5">
                            {statusText}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {totalCount > 0 && (
                    <button
                      onClick={clearAllOperations}
                      className="w-full mt-2 pt-2 border-t border-white/10 text-xs text-white/40 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider font-medium"
                    >
                      <XCircle size={12} />
                      {AsyncStatusIndicatorUiCopy.ClearAllStale}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/50 text-center py-2 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500/50" />
                  {AsyncStatusIndicatorUiCopy.NoActiveOperations}
                </div>
              )}
            </div>
          </LiquidGlass>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
