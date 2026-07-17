import { isActiveTaskStatus } from '@/shared/data/constants/polling'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { fetchTrigger3dRunStatus } from '../../core/io/asset-exporter.api'
import {
  GenerationStatus,
  parseGenerationMetadata,
  type GenerationMetadata,
  type MeshyResult,
} from '../../core/types/three-d-generation'
import { readString } from '@/shared/data/json-guards'
import {
  ThreeDOperationDetails,
  ThreeDOperationIdPrefix,
  ThreeDOperationLabel,
  ThreeDOperationType,
  ThreeDProviderFallback,
  ThreeDRunKind,
  TriggerCompletedStatus,
} from '../../constants/three-d-operation-wire'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'

export interface ThreeDHydrationResult {
  modelFilename?: string
  generationResult?: MeshyResult
  meshyTaskId?: string
  remeshResult?: MeshyResult
  remeshModelUrl?: string
  resumeGenerationRunId?: string
  resumeRemeshRunId?: string
}

type SaveMetadata = (patch: Partial<GenerationMetadata>) => Promise<void>

function failedStatusPatch(kind: ThreeDRunKind): Partial<GenerationMetadata> {
  return kind === ThreeDRunKind.Generation
    ? { generation_status: GenerationStatus.Failed }
    : { remesh_status: GenerationStatus.Failed }
}

function terminalStatusPatch(
  kind: ThreeDRunKind,
  status: string | null | undefined
): Partial<GenerationMetadata> {
  const next =
    status === TriggerCompletedStatus.Completed
      ? GenerationStatus.Completed
      : GenerationStatus.Failed
  return kind === ThreeDRunKind.Generation
    ? { generation_status: next }
    : { remesh_status: next }
}

function addResumeOperation(params: {
  assetId: string
  kind: ThreeDRunKind
  providerLabel: string
}): void {
  if (params.kind === ThreeDRunKind.Generation) {
    useGlobalStatusStore.getState().addOperation({
      id: `${ThreeDOperationIdPrefix.Generation}${params.assetId}`,
      type: ThreeDOperationType.Generation,
      label: ThreeDOperationLabel.Generating,
      details: `${params.providerLabel} - Resuming...`,
      status: AsyncOperationStatus.InProgress,
    })
    return
  }

  useGlobalStatusStore.getState().addOperation({
    id: `${ThreeDOperationIdPrefix.Remesh}${params.assetId}`,
    type: ThreeDOperationType.Remesh,
    label: ThreeDOperationLabel.Remeshing,
    details: ThreeDOperationDetails.MeshyResuming,
    status: AsyncOperationStatus.InProgress,
  })
}

async function resumeOrClearRun(params: {
  runId: string
  assetId: string
  kind: ThreeDRunKind
  providerLabel: string
  saveMetadata: SaveMetadata
}): Promise<boolean> {
  const { runId, assetId, kind, providerLabel, saveMetadata } = params
  try {
    const statusData = await fetchTrigger3dRunStatus(runId)
    if (statusData.statusCode === 404) {
      await saveMetadata(failedStatusPatch(kind))
      return false
    }

    const status = statusData.status
    if (status && isActiveTaskStatus(status)) {
      addResumeOperation({ assetId, kind, providerLabel })
      return true
    }

    await saveMetadata(terminalStatusPatch(kind, status))
    return false
  } catch {
    await saveMetadata(failedStatusPatch(kind))
    return false
  }
}

function applyStaticMetadata(
  result: ThreeDHydrationResult,
  metadata: GenerationMetadata
): void {
  if (metadata.generation_result) result.generationResult = metadata.generation_result
  if (metadata.meshy_task_id) result.meshyTaskId = metadata.meshy_task_id
  if (metadata.remesh_result) {
    result.remeshResult = metadata.remesh_result
    if (metadata.remesh_result.model_urls?.glb) {
      result.remeshModelUrl = metadata.remesh_result.model_urls.glb
    }
  }
}

export async function hydrateThreeDAsset(params: {
  assetId: string
  hasModelUrl: boolean
  metadataRaw: unknown
  modelFilenameRaw: unknown
  saveMetadata: SaveMetadata
}): Promise<ThreeDHydrationResult> {
  const result: ThreeDHydrationResult = {}
  const modelFilename = readString(params.modelFilenameRaw)
  if (modelFilename && !params.hasModelUrl) {
    result.modelFilename = modelFilename
  }

  const metadata = parseGenerationMetadata(params.metadataRaw)
  if (!metadata) return result

  applyStaticMetadata(result, metadata)

  if (metadata.trigger_run_id && metadata.generation_status === GenerationStatus.Processing) {
    const resume = await resumeOrClearRun({
      runId: metadata.trigger_run_id,
      assetId: params.assetId,
      kind: ThreeDRunKind.Generation,
      providerLabel: metadata.provider || ThreeDProviderFallback.Meshy,
      saveMetadata: params.saveMetadata,
    })
    if (resume) result.resumeGenerationRunId = metadata.trigger_run_id
  }

  if (metadata.remesh_run_id && metadata.remesh_status === GenerationStatus.Processing) {
    const resume = await resumeOrClearRun({
      runId: metadata.remesh_run_id,
      assetId: params.assetId,
      kind: ThreeDRunKind.Remesh,
      providerLabel: ThreeDProviderFallback.Meshy,
      saveMetadata: params.saveMetadata,
    })
    if (resume) result.resumeRemeshRunId = metadata.remesh_run_id
  }

  return result
}
