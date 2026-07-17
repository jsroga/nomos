'use client'

import React from 'react'
import toast from 'react-hot-toast'
import { interiorDesignerApi } from '@/domains/interior-designer/core/io/interior-designer.api'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  InteriorAsyncOperationType,
  PropertiesPanelError,
  PropertiesPanelLabel,
  PropertiesPanelLog,
  PropertiesPanelToast,
  RETEXTURE_OPERATION_ID_PREFIX,
} from '@/domains/interior-designer/constants/properties-panel'
import { RETEXTURE_EMPTY_METADATA } from '@/domains/interior-designer/constants/retexture-slice-log'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { pollInteriorTriggerRun } from '@/domains/interior-designer/state/utils/poll-interior-trigger-run'
import { buildRetextureStartMetadata } from '@/domains/interior-designer/state/utils/build-retexture-start-metadata'
import { isRetextureableModelUrl } from '@/domains/interior-designer/state/utils/retexture-model-url'
import { syncStaleRetextureOperation } from '@/domains/interior-designer/state/utils/sync-stale-retexture-operation'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  RetextureActiveView,
  RetextureCompletedView,
  RetextureFailedView,
  RetextureFormView,
} from './retexture-controls-views'
import {
  RetextureViewPhase,
  resolveRetextureViewState,
} from './retexture-view-state'

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
    const persistedOperation = useGlobalStatusStore
      .getState()
      .operations.find(op => op.id === operationId)

    void syncStaleRetextureOperation({
      operationId,
      objectId,
      currentOperation: persistedOperation,
      previewRetexture,
      updateOperation,
    })
  }, [operationId, objectId, previewRetexture, updateOperation])

  React.useEffect(() => {
    if (!currentOperation) return
    if (isTerminalOperationStatus(currentOperation.status)) return

    let taskId: string | null = null
    let detailsBase: Record<string, unknown> = {}
    try {
      detailsBase = recordFromJson(JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA))
      taskId = readString(detailsBase.taskId) ?? null
    } catch {
      return
    }
    if (!taskId) return

    const runId = taskId
    let aborted = false
    void pollInteriorTriggerRun(
      () => interiorDesignerApi.retexture.getStatus(runId),
      {
        shouldAbort: () => {
          if (aborted) return true
          const latestOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
          return !latestOp || isTerminalOperationStatus(latestOp.status)
        },
        onCompleted: async data => {
          const output = recordFromJson(data.output)
          const retexturedUrl =
            readString(output.retexturedUrl) ||
            readString(output.url) ||
            readString(output.modelUrl)

          if (retexturedUrl) {
            previewRetexture(objectId, retexturedUrl)
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({ ...detailsBase, retexturedUrl }),
            })
          } else {
            updateOperation(operationId, {
              status: AsyncOperationStatus.Failed,
              details: JSON.stringify({
                ...detailsBase,
                error: PropertiesPanelError.OutputMissingUrl,
              }),
            })
          }
        },
        onFailed: async data => {
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({ ...detailsBase, error: data.error }),
          })
        },
      },
      { intervalMs: POLLING_INTERVALS.DEFAULT, maxPolls: 120 }
    ).catch(err => {
      console.error(PropertiesPanelLog.PollError, err)
    })

    return () => {
      aborted = true
    }
  }, [currentOperation, operationId, updateOperation, previewRetexture, objectId])

  const triggerRetexture = React.useCallback(
    async (urlOrBase64: string) => {
      try {
        const apiKey = browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_MESHY)

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
          updateOperation(operationId, {
            status: AsyncOperationStatus.InProgress,
            details: JSON.stringify(buildRetextureStartMetadata(objectId, modelUrl, data.runId)),
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

    if (!isRetextureableModelUrl(modelUrl)) {
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

  const viewState = resolveRetextureViewState(currentOperation)

  if (viewState.phase === RetextureViewPhase.Completed) {
    return (
      <RetextureCompletedView
        object={object}
        onApprove={() => approveRetexture(objectId)}
        onCancel={() => cancelRetexture(objectId)}
        onScaleChange={handleScaleChange}
      />
    )
  }

  if (viewState.phase === RetextureViewPhase.Active) {
    return <RetextureActiveView currentOperation={viewState.operation} />
  }

  if (viewState.phase === RetextureViewPhase.Failed) {
    return <RetextureFailedView onClear={() => removeOperation(operationId)} />
  }

  return (
    <RetextureFormView
      prompt={prompt}
      isStarting={isStarting}
      onPromptChange={setPrompt}
      onGenerate={handleGenerate}
    />
  )
}
