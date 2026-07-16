'use client'

import React from 'react'
import { Box, Check, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { interiorDesignerApi } from '@/domains/interior-designer/core/io/interior-designer.api'
import { InteriorDefaultProjectId } from '@/domains/interior-designer/constants/interior-api-defaults'
import {
  InteriorAsyncOperationType,
  PropertiesPanelLog,
  PropertiesPanelStatusLabel,
  PropertiesPanelToast,
  TEXT_TO_3D_OPERATION_ID_PREFIX,
} from '@/domains/interior-designer/constants/properties-panel'
import { RETEXTURE_EMPTY_METADATA } from '@/domains/interior-designer/constants/retexture-slice-log'
import { seedFromString } from '@/shared/data/seedFromString'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { POLLING_INTERVALS, isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'

interface TextTo3DControlsProps {
  objectId: string
  projectId: string
  onModelGenerated: (modelUrl: string) => void
}

export function TextTo3DControls({
  objectId,
  projectId,
  onModelGenerated,
}: TextTo3DControlsProps) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)

  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  const operationId = `${TEXT_TO_3D_OPERATION_ID_PREFIX}${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)
  const resolvedProjectId = projectId || InteriorDefaultProjectId.Default

  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (isTerminalOperationStatus(currentOperation.status)) return

      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
        taskId = metadata.taskId
      } catch (err) {
        console.error(PropertiesPanelLog.TextTo3DMetadataParseFailed, err)
        return
      }

      if (!taskId) return

      console.log(`[TextTo3D] Checking stale operation ${operationId} with taskId ${taskId}`)

      try {
        const data = await interiorDesignerApi.textTo3D.getStatus(taskId)
        console.log(`[TextTo3D] Stale check result for ${operationId}:`, data.status)

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          if (output && output.success) {
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                taskId,
                modelUrl: output.modelUrl,
                assetId: output.assetId,
                thumbnailUrl: output.thumbnailUrl,
              }),
            })
            console.log(`[TextTo3D] Stale operation ${operationId} was actually completed`)
          }
        } else if (!isActiveTaskStatus(data.status)) {
          console.warn(`${PropertiesPanelLog.TextTo3DTaskFailed} ${data.status}`)
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status }),
          })
        }
      } catch (err) {
        console.error(PropertiesPanelLog.TextTo3DCleanupError, err)
      }
    }

    cleanupStaleOperation()
  }, [])

  React.useEffect(() => {
    if (!currentOperation) return
    if (isTerminalOperationStatus(currentOperation.status)) {
      console.log(
        `[TextTo3D] Polling stopped for ${operationId} - terminal state: ${currentOperation.status}`
      )
      return
    }

    console.log(
      `[TextTo3D] Starting polling for ${operationId} - status: ${currentOperation.status}`
    )

    let pollInterval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const latestOp = useGlobalStatusStore
          .getState()
          .operations.find(op => op.id === operationId)
        if (!latestOp || isTerminalOperationStatus(latestOp.status)) {
          console.log(PropertiesPanelLog.TextTo3DPollSkipped)
          return
        }

        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
          taskId = metadata.taskId
        } catch (err) {
          console.error(PropertiesPanelLog.OperationMetadataParseFailed, err)
          return
        }

        if (!taskId) return

        const data = await interiorDesignerApi.textTo3D.getStatus(taskId)
        console.log(`[TextTo3D] Poll result for ${operationId}:`, data.status)

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          if (output && output.success) {
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                taskId,
                modelUrl: output.modelUrl,
                assetId: output.assetId,
                thumbnailUrl: output.thumbnailUrl,
              }),
            })
            console.log(`[TextTo3D] Marked ${operationId} as completed`)
          }
        } else if (!isActiveTaskStatus(data.status)) {
          console.error(PropertiesPanelLog.TextTo3DTaskFailed, data.status, data.error)
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status }),
          })
        }
      } catch (err) {
        console.error(PropertiesPanelLog.PollError, err)
      }
    }

    pollInterval = setInterval(checkStatus, POLLING_INTERVALS.SLOW)
    return () => {
      console.log(`[TextTo3D] Clearing interval for ${operationId}`)
      clearInterval(pollInterval)
    }
  }, [currentOperation, operationId, updateOperation])

  const handleGenerate = async () => {
    if (!prompt) return

    if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
      toast.error(PropertiesPanelToast.TextTo3DJobInProgress)
      return
    }

    setIsStarting(true)

    addOperation({
      id: operationId,
      type: InteriorAsyncOperationType.TextTo3D,
      label: `Generating 3D: ${prompt.slice(0, 30)}...`,
      details: JSON.stringify({ prompt }),
      status: AsyncOperationStatus.Pending,
    })

    try {
      let apiKey = ''
      try {
        const savedMeshy = localStorage.getItem(LocalStorageKeys.AI_CONFIG_MESHY)
        if (savedMeshy) {
          const config = JSON.parse(savedMeshy)
          apiKey = config.apiKey || ''
        }
      } catch (err) {
        console.warn(PropertiesPanelLog.MeshyKeyReadFailed, err)
      }

      let masterPrompt = ''
      if (resolvedProjectId) {
        masterPrompt =
          localStorage.getItem(`${LocalStorageKeys.MASTER_PROMPT}-${resolvedProjectId}`) || ''
      }

      const seed = seedFromString(`${masterPrompt}|${prompt}`)

      const data = await interiorDesignerApi.textTo3D.start({
        projectId: resolvedProjectId,
        prompt,
        seed,
        apiKey,
      })
      if (data.runId) {
        updateOperation(operationId, {
          status: AsyncOperationStatus.InProgress,
          details: JSON.stringify({ taskId: data.runId, prompt, seed }),
        })
        toast.success(PropertiesPanelToast.TextTo3DStarted)
      }
    } catch (e: unknown) {
      toast.error(PropertiesPanelToast.TextTo3DStartFailed + getErrorMessage(e))
      removeOperation(operationId)
    } finally {
      setIsStarting(false)
    }
  }

  const handleApply = () => {
    if (!currentOperation) return

    try {
      const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
      if (metadata.modelUrl) {
        onModelGenerated(metadata.modelUrl)
        toast.success(PropertiesPanelToast.ModelApplied)
      }
    } catch (e) {
      console.error(PropertiesPanelLog.ApplyModelFailed, e)
    }

    removeOperation(operationId)
    setPrompt('')
  }

  const handleDiscard = () => {
    removeOperation(operationId)
    setPrompt('')
  }

  if (currentOperation && currentOperation.status === AsyncOperationStatus.Completed) {
    let thumbnailUrl = ''
    try {
      const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
      thumbnailUrl = metadata.thumbnailUrl || ''
    } catch {
      /* ignore malformed metadata */
    }

    return (
      <div className="pt-4 border-t border-border animate-in fade-in">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wide mb-2 flex items-center gap-2 text-blue-500">
          <Box size={12} />
          3D Model Ready
        </h3>
        {thumbnailUrl && (
          <div className="mb-3 rounded overflow-hidden border border-border">
            <img
              src={thumbnailUrl}
              alt="Generated 3D preview"
              className="w-full h-24 object-cover"
            />
          </div>
        )}
        <div className="bg-muted/30 p-2 rounded text-xs mb-3 font-mono">
          New 3D model generated. Apply to replace current object.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleApply}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 font-mono text-xs"
          >
            <Check size={14} className="mr-1" /> Apply
          </Button>
          <Button
            onClick={handleDiscard}
            size="sm"
            variant="destructive"
            className="w-full font-mono text-xs"
          >
            <X size={14} className="mr-1" /> Discard
          </Button>
        </div>
      </div>
    )
  }

  if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 rounded gap-2">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="text-xs text-muted-foreground font-mono">
            {currentOperation.status === AsyncOperationStatus.Pending
              ? PropertiesPanelStatusLabel.StartingJob
              : PropertiesPanelStatusLabel.Generating3DModel}
          </span>
          <span className="text-[10px] text-muted-foreground">This may take several minutes</span>
        </div>
      </div>
    )
  }

  if (currentOperation && currentOperation.status === AsyncOperationStatus.Failed) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs">
          <p className="font-semibold text-destructive mb-1 font-mono uppercase tracking-wide">
            3D Generation Failed
          </p>
          <p className="text-muted-foreground mb-2">
            An error occurred while generating the model.
          </p>
          <Button
            onClick={() => removeOperation(operationId)}
            size="sm"
            variant="outline"
            className="w-full"
          >
            Clear Error
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-zinc-800 space-y-3">
      <div className="flex items-center gap-2">
        <Box size={14} className="text-blue-500" />
        <h3 className="text-xs font-mono font-bold uppercase tracking-wide">Generate 3D Object</h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wide">
          Object Description
        </label>
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="A medieval wooden chair..."
          className="text-xs font-mono h-8"
        />
        <Button
          onClick={handleGenerate}
          disabled={!prompt || isStarting}
          className="w-full h-8 text-xs font-mono"
          variant="outline"
        >
          {isStarting ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Box className="mr-2 h-3 w-3" />
          )}
          Generate 3D Model
        </Button>
        <p className="text-[10px] text-muted-foreground font-mono">
          Uses Meshy AI to create a 3D model from text. Takes 2-5 minutes.
        </p>
      </div>
    </div>
  )
}
