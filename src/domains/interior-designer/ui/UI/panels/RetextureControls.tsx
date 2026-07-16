'use client'

import React from 'react'
import { Check, Loader2, Sparkles, Wand2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Slider } from '@/components/Slider'
import { SidebarLabel, SidebarSection } from '@/components/DomainSidebar'
import { interiorDesignerApi } from '@/domains/interior-designer/core/io/interior-designer.api'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  InteriorAsyncOperationType,
  ModelFileExtension,
  PropertiesPanelError,
  PropertiesPanelLabel,
  PropertiesPanelLog,
  PropertiesPanelStatusLabel,
  PropertiesPanelToast,
  RetextureMetadataOriginalType,
  RETEXTURE_OPERATION_ID_PREFIX,
  UrlSchemePrefix,
} from '@/domains/interior-designer/constants/properties-panel'
import { RETEXTURE_EMPTY_METADATA } from '@/domains/interior-designer/constants/retexture-slice-log'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { POLLING_INTERVALS, isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'

interface RetextureControlsProps {
  objectId: string
  modelUrl: string
  projectId: string
}

export function RetextureControls({ objectId, modelUrl, projectId }: RetextureControlsProps) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)

  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  const previewRetexture = useInteriorStore(state => state.previewRetexture)
  const cancelRetexture = useInteriorStore(state => state.cancelRetexture)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const retextureModelBase64 = useInteriorStore(state => state.retextureModelBase64)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)
  const updateObject = useInteriorStore(state => state.updateObject)
  const object = useInteriorStore(state => state.objects.find(o => o.id === objectId))

  const operationId = `${RETEXTURE_OPERATION_ID_PREFIX}${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (isTerminalOperationStatus(currentOperation.status)) return

      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
        taskId = metadata.taskId
      } catch (err) {
        console.error(PropertiesPanelLog.RetextureMetadataParseFailed, err)
        return
      }

      if (!taskId) return

      console.log(`[Retexture] Checking stale operation ${operationId} with taskId ${taskId}`)

      try {
        const data = await interiorDesignerApi.retexture.getStatus(taskId)
        if (!data.status) {
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({
              ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
              error: PropertiesPanelError.TaskNotFound,
            }),
          })
          return
        }

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          if (output && output.success) {
            const retexturedUrl = output.retexturedUrl
            if (!retexturedUrl) return

            previewRetexture(objectId, retexturedUrl)
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
                retexturedUrl: output.retexturedUrl,
              }),
            })
          }
        } else if (!isActiveTaskStatus(data.status)) {
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({
              ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
              error: data.error,
            }),
          })
        }
      } catch (err) {
        console.error(PropertiesPanelLog.RetextureCleanupError, err)
      }
    }

    cleanupStaleOperation()
  }, [])

  React.useEffect(() => {
    if (!currentOperation) return
    if (isTerminalOperationStatus(currentOperation.status)) return

    const checkStatus = async () => {
      try {
        const latestOp = useGlobalStatusStore
          .getState()
          .operations.find(op => op.id === operationId)
        if (!latestOp || isTerminalOperationStatus(latestOp.status)) return

        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
          taskId = metadata.taskId
        } catch {
          return
        }

        if (!taskId) return

        const data = await interiorDesignerApi.retexture.getStatus(taskId)

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          const retexturedUrl = output?.retexturedUrl || output?.url || output?.modelUrl

          if (retexturedUrl) {
            previewRetexture(objectId, retexturedUrl)
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
                retexturedUrl,
              }),
            })
          } else {
            updateOperation(operationId, {
              status: AsyncOperationStatus.Failed,
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
                error: PropertiesPanelError.OutputMissingUrl,
              }),
            })
          }
        } else if (!isActiveTaskStatus(data.status)) {
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({
              ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
              error: data.error,
            }),
          })
        }
      } catch (err) {
        console.error(PropertiesPanelLog.PollError, err)
      }
    }

    const pollInterval = setInterval(checkStatus, POLLING_INTERVALS.DEFAULT)
    return () => clearInterval(pollInterval)
  }, [currentOperation, operationId, updateOperation, previewRetexture, objectId])

  const triggerRetexture = React.useCallback(
    async (urlOrBase64: string) => {
      try {
        let apiKey = ''
        try {
          const savedMeshy = localStorage.getItem(LocalStorageKeys.AI_CONFIG_MESHY)
          if (savedMeshy) apiKey = JSON.parse(savedMeshy).apiKey || ''
        } catch (err) {
          console.warn(PropertiesPanelLog.RetextureMeshyKeyReadFailed, err)
        }

        console.log(
          `[RetextureControls] Sending retexture request with projectId: ${projectId}`
        )

        const data = await interiorDesignerApi.retexture.start({
          modelUrlOrBase64: urlOrBase64,
          prompt,
          assetId: objectId,
          projectId,
          apiKey,
        })

        if (data.runId) {
          const metadata: Record<string, unknown> = {
            taskId: data.runId,
            originalModelUrl: modelUrl,
          }

          const wallData = useInteriorStore.getState().walls.find(w => w.id === objectId)
          if (wallData) {
            metadata.originalType = RetextureMetadataOriginalType.Wall
            metadata.originalData = wallData
          } else {
            const surfaceData = useInteriorStore.getState().surfaces.find(s => s.id === objectId)
            if (surfaceData) {
              metadata.originalType = RetextureMetadataOriginalType.Surface
              metadata.originalData = surfaceData
            } else {
              metadata.originalType = RetextureMetadataOriginalType.Object
            }
          }

          updateOperation(operationId, {
            status: AsyncOperationStatus.InProgress,
            details: JSON.stringify(metadata),
          })
        }
      } catch (_e: unknown) {
        toast.error(PropertiesPanelToast.RetextureStartFailed)
        removeOperation(operationId)
        setIsStarting(false)
      }
    },
    [prompt, objectId, operationId, updateOperation, removeOperation, modelUrl, projectId]
  )

  React.useEffect(() => {
    if (isStarting && retextureModelBase64) {
      triggerRetexture(retextureModelBase64)
      setRetextureModelBase64(null)
      setIsStarting(false)
    }
  }, [retextureModelBase64, isStarting, triggerRetexture, setRetextureModelBase64])

  const handleGenerate = async () => {
    if (!prompt) return

    if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
      toast.error(PropertiesPanelToast.JobInProgress)
      return
    }

    setIsStarting(true)

    addOperation({
      id: operationId,
      type: InteriorAsyncOperationType.Retexture,
      label: PropertiesPanelLabel.RetexturingElement,
      details: JSON.stringify({ prompt, originalModelUrl: modelUrl }),
      status: AsyncOperationStatus.Pending,
    })

    setRetextureModelBase64(null)

    const is3DModelUrl =
      modelUrl &&
      (modelUrl.endsWith(ModelFileExtension.Glb) ||
        modelUrl.endsWith(ModelFileExtension.Gltf) ||
        modelUrl.startsWith(UrlSchemePrefix.Http))

    if (!is3DModelUrl) {
      setRequestRetextureExport(true)
      return
    }

    try {
      await triggerRetexture(modelUrl)
    } finally {
      setIsStarting(false)
    }
  }

  const handleScaleChange = (val: number[]) => {
    const scale = val[0]
    if (object) {
      updateObject(objectId, { scale: [scale, scale, scale] })
    }
  }

  if (currentOperation && currentOperation.status === AsyncOperationStatus.Completed) {
    return (
      <div className="pt-4 border-t border-zinc-800 animate-in fade-in space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wide mb-2 flex items-center gap-2 text-primary">
          <Sparkles size={12} />
          Review Result
        </h3>
        <div className="bg-zinc-950/30 p-2 rounded text-xs border border-zinc-800/30">
          New texture generated. Adjust scale if needed.
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
            <label className="font-mono uppercase tracking-wide text-[10px]">Size Correction</label>
            <span>{object?.scale[0].toFixed(2)}x</span>
          </div>
          <Slider
            min={0.1}
            max={5}
            step={0.1}
            value={[object?.scale[0] || 1]}
            onValueChange={val => handleScaleChange(val)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => approveRetexture(objectId)}
            size="sm"
            className="flex-1 h-8 text-xs font-mono"
          >
            <Check size={12} className="mr-1.5" /> Apply
          </Button>
          <Button
            onClick={() => cancelRetexture(objectId)}
            size="sm"
            variant="ghost"
            className="flex-1 h-8 text-xs font-mono text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X size={12} className="mr-1.5" /> Discard
          </Button>
        </div>
      </div>
    )
  }

  if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/20 rounded gap-2">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs font-mono text-muted-foreground">
            {currentOperation.status === AsyncOperationStatus.Pending
              ? PropertiesPanelStatusLabel.StartingJob
              : PropertiesPanelStatusLabel.GeneratingTexture}
          </span>
        </div>
      </div>
    )
  }

  if (currentOperation && currentOperation.status === AsyncOperationStatus.Failed) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs">
          <p className="font-semibold text-destructive mb-1">Retexture Failed</p>
          <p className="text-muted-foreground mb-2">
            An error occurred while generating the texture.
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
    <SidebarSection title="AI Retexture" icon={<Sparkles size={12} />} separator>
      <div className="space-y-2">
        <SidebarLabel>Description</SidebarLabel>
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Rusty metal, mossy stone..."
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
            <Wand2 className="mr-2 h-3 w-3" />
          )}
          Generate New Texture
        </Button>
      </div>
    </SidebarSection>
  )
}
