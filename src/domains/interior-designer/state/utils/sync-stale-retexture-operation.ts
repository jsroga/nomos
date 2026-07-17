import { interiorDesignerApi } from '@/domains/interior-designer/core/io/interior-designer.api'
import {
  PropertiesPanelError,
  PropertiesPanelLog,
} from '@/domains/interior-designer/constants/properties-panel'
import { RETEXTURE_EMPTY_METADATA } from '@/domains/interior-designer/constants/retexture-slice-log'
import { isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'
import {
  AsyncOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'

interface SyncStaleRetextureParams {
  operationId: string
  objectId: string
  currentOperation: AsyncOperation | undefined
  previewRetexture: (objectId: string, retexturedUrl: string) => void
  updateOperation: (id: string, updates: Partial<AsyncOperation>) => void
}

function parseOperationDetails(details: string | undefined): Record<string, unknown> {
  return JSON.parse(details || RETEXTURE_EMPTY_METADATA)
}

function readTaskId(details: string | undefined): string | null {
  try {
    const metadata = parseOperationDetails(details)
    const taskId = metadata.taskId
    return typeof taskId === 'string' ? taskId : null
  } catch (err) {
    console.error(PropertiesPanelLog.RetextureMetadataParseFailed, err)
    return null
  }
}

function updateOperationDetails(
  operationId: string,
  currentOperation: AsyncOperation,
  patch: Record<string, unknown>,
  status: AsyncOperationStatus,
  updateOperation: SyncStaleRetextureParams['updateOperation']
): void {
  updateOperation(operationId, {
    status,
    details: JSON.stringify({
      ...parseOperationDetails(currentOperation.details),
      ...patch,
    }),
  })
}

async function handleStaleRetextureSuccess(
  params: SyncStaleRetextureParams,
  currentOperation: AsyncOperation,
  output: { success?: boolean; retexturedUrl?: string }
): Promise<void> {
  if (!output.success) return

  const retexturedUrl = output.retexturedUrl
  if (!retexturedUrl) return

  params.previewRetexture(params.objectId, retexturedUrl)
  updateOperationDetails(
    params.operationId,
    currentOperation,
    { retexturedUrl },
    AsyncOperationStatus.Completed,
    params.updateOperation
  )
}

export async function syncStaleRetextureOperation(
  params: SyncStaleRetextureParams
): Promise<void> {
  const { currentOperation, operationId } = params
  if (!currentOperation) return
  if (isTerminalOperationStatus(currentOperation.status)) return

  const taskId = readTaskId(currentOperation.details)
  if (!taskId) return

  console.log(`[Retexture] Checking stale operation ${operationId} with taskId ${taskId}`)

  try {
    const data = await interiorDesignerApi.retexture.getStatus(taskId)
    if (!data.status) {
      updateOperationDetails(
        operationId,
        currentOperation,
        { error: PropertiesPanelError.TaskNotFound },
        AsyncOperationStatus.Failed,
        params.updateOperation
      )
      return
    }

    if (isSuccessTaskStatus(data.status)) {
      const output = data.output
      if (output) {
        await handleStaleRetextureSuccess(params, currentOperation, output)
      }
      return
    }

    if (!isActiveTaskStatus(data.status)) {
      updateOperationDetails(
        operationId,
        currentOperation,
        { error: data.error },
        AsyncOperationStatus.Failed,
        params.updateOperation
      )
    }
  } catch (err) {
    console.error(PropertiesPanelLog.RetextureCleanupError, err)
  }
}
