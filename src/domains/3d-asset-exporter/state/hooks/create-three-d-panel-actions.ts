'use client'

import toast from 'react-hot-toast'
import { AIProvider } from '@/shared/types/enums'
import { browserStorage } from '@/shared/data/browser-storage'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import {
  fetchMeshyImageTo3dTask,
  fetchProxiedModelBlob,
  trigger3dGeneration,
  trigger3dRemesh,
  triggerModelUpload,
} from '../../core/io/asset-exporter.api'
import {
  GenerationStatus,
  MeshyTopology,
  generationMetadataToRow,
  meshyResultToDomain,
  meshyResultWireSchema,
  type GenerationMetadata,
  type MeshyResult,
} from '../../contracts'
import {
  ThreeDOperationIdPrefix,
  ThreeDOperationLabel,
  ThreeDOperationType,
} from '../../constants/three-d-operation-wire'
import { ThreeDPollCopy } from '../../constants/three-d-poll-copy'

enum MeshyTaskStatus {
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}

enum ThreeDActionCopy {
  NoMeshyTaskId = 'No Meshy task ID found',
  RecoverLoading = 'Attempting to recover from Meshy...',
  NoApiKey = 'No Meshy API key found. Set it in Settings.',
  RecoverSuccess = 'Asset recovered successfully!',
  RecoverFailed = 'Recovery failed:',
  UnknownError = 'Unknown error',
  GenStarting = 'Starting 3D generation... This may take up to 15 minutes.',
  GenStarted = '3D generation started! Monitoring progress...',
  GenFailedStart = 'Failed to Start:',
  DownloadFailed = 'Download failed. Try right-clicking and "Save as".',
  GenStopped = 'Generation stopped. You can start a new one.',
  RemeshNeedModel = 'No Meshy task ID found. Generate a model first.',
  RemeshStarting = 'Starting remesh... This may take a few minutes.',
  RemeshStarted = 'Remesh started! Optimizing your 3D model...',
  RemeshFailedStart = 'Failed to Start Remesh:',
  RemeshStopped = 'Remesh stopped.',
  UploadNoModel = 'No 3D model to upload',
  UploadInvalidUrl = 'Invalid model URL',
  UploadStarting = 'Starting upload to Vercel Blob...',
  UploadStarted = 'Upload started! Monitoring progress...',
  UploadFailedStart = 'Failed to Start Upload:',
  UploadStopped = 'Upload stopped.',
  UploadOpIdPrefix = 'upload-',
  UploadOpType = 'upload',
  UploadOpLabel = 'Uploading to Vercel',
  InProgressDetails = 'In progress',
  BlankTarget = '_blank',
  NoopenerRel = 'noopener noreferrer',
  Failed = 'failed',
}

function providerConfigKey(provider: AIProvider): string {
  return provider === AIProvider.Meshy
    ? LocalStorageKeys.AI_CONFIG_MESHY
    : LocalStorageKeys.AI_CONFIG_HYPER3D
}

/** The GLB url a Meshy result carries, once the contract has parsed it. */
function readGlbFromMeshyResult(result: MeshyResult | undefined): string | undefined {
  return result?.modelUrls?.glb ?? result?.modelUrl
}

export interface ThreeDPanelActionsDeps {
  assetId: string
  imageUrl: string
  provider: AIProvider
  topology: MeshyTopology
  targetPolycount: number
  remeshTopology: MeshyTopology
  remeshPolycount: number
  remeshHeight: string
  meshyTaskId: string | null
  modelUrl: string | undefined
  currentProject: { id: string } | null
  user: unknown
  updateAsset?: (id: string, patch: { model_filename?: string }) => void
  saveMetadata: (patch: Partial<GenerationMetadata>) => Promise<void>
  updateAssetViaApi: (updates: {
    model_filename?: string
    metadata?: Partial<GenerationMetadata>
  }) => Promise<void>
  setModelUrl: (url: string | undefined) => void
  setGenerationResult: (result: MeshyResult | null) => void
  setMeshyTaskId: (id: string | null) => void
  setIsRecovering: (v: boolean) => void
  setIsGenerating: (v: boolean) => void
  setCurrentRunId: (id: string | null) => void
  setProgress: (n: number) => void
  setIsRemeshing: (v: boolean) => void
  setRemeshProgress: (n: number) => void
  setShowRemeshSettings: (v: boolean) => void
  setRemeshRunId: (id: string | null) => void
  setIsUploading: (v: boolean) => void
  setUploadProgress: (n: number) => void
  setUploadRunId: (id: string | null) => void
  clearGenerationState: (status?: GenerationStatus) => Promise<void>
  clearRemeshState: (status?: GenerationStatus) => Promise<void>
  clearUploadState: (status?: GenerationStatus) => Promise<void>
}

export function createThreeDPanelActions(deps: ThreeDPanelActionsDeps) {
  const handleRecoverFromMeshy = async () => {
    if (!deps.meshyTaskId) {
      toast.error(ThreeDActionCopy.NoMeshyTaskId)
      return
    }

    deps.setIsRecovering(true)
    toast.loading(ThreeDActionCopy.RecoverLoading)

    try {
      const configKey = providerConfigKey(deps.provider)
      if (!browserStorage.getString(configKey)) {
        throw new Error(ThreeDActionCopy.NoApiKey)
      }
      const apiKey = browserStorage.getAiApiKey(configKey)
      const result = await fetchMeshyImageTo3dTask(deps.meshyTaskId, apiKey)
      toast.dismiss()

      if (result.status === MeshyTaskStatus.Succeeded) {
        const generationResult = meshyResultToDomain(meshyResultWireSchema.parse(result))
        const recoveredUrl = readGlbFromMeshyResult(generationResult)
        deps.setModelUrl(recoveredUrl)
        if (generationResult) deps.setGenerationResult(generationResult)

        await deps.updateAssetViaApi({
          model_filename: recoveredUrl,
          metadata: generationMetadataToRow({
            generationStatus: GenerationStatus.Completed,
            meshyTaskId: deps.meshyTaskId,
            generationResult,
          }),
        })

        if (deps.updateAsset && recoveredUrl) {
          deps.updateAsset(deps.assetId, { model_filename: recoveredUrl })
        }
        toast.success(ThreeDActionCopy.RecoverSuccess)
        return
      }

      if (result.status === MeshyTaskStatus.Failed) {
        toast.error(`Meshy task failed: ${result.error || ThreeDActionCopy.UnknownError}`)
        return
      }

      toast(`Meshy task status: ${result.status}. Progress: ${result.progress}%`, {
        icon: ThreeDPollCopy.InfoIcon,
      })
    } catch (err: unknown) {
      toast.dismiss()
      toast.error(`${ThreeDActionCopy.RecoverFailed} ${getErrorMessage(err)}`)
    } finally {
      deps.setIsRecovering(false)
    }
  }

  const handleGenerate = async () => {
    if (!deps.currentProject || !deps.user) return

    deps.setIsGenerating(true)
    deps.setMeshyTaskId(null)

    try {
      const configKey = providerConfigKey(deps.provider)
      const apiKey = browserStorage.getAiApiKey(configKey)
      toast.loading(ThreeDActionCopy.GenStarting)

      const { runId } = await trigger3dGeneration({
        projectId: deps.currentProject.id,
        assetId: deps.assetId,
        imageUrl: deps.imageUrl,
        provider: deps.provider,
        apiKey,
        topology: deps.topology,
        targetPolycount: deps.targetPolycount,
      })

      toast.dismiss()
      toast.success(ThreeDActionCopy.GenStarted)

      await deps.saveMetadata({
        triggerRunId: runId,
        generationStatus: GenerationStatus.Processing,
        generationStartedAt: new Date().toISOString(),
        provider: deps.provider,
      })

      deps.setCurrentRunId(runId)
      useGlobalStatusStore.getState().addOperation({
        id: `${ThreeDOperationIdPrefix.Generation}${deps.assetId}`,
        type: ThreeDOperationType.Generation,
        label: ThreeDOperationLabel.Generating,
        details: `${deps.provider} - ${ThreeDActionCopy.InProgressDetails}`,
        status: AsyncOperationStatus.InProgress,
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`${ThreeDActionCopy.GenFailedStart} ${getErrorMessage(error)}`)
      deps.setIsGenerating(false)
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const blob = await fetchProxiedModelBlob(url)
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
        return
      }

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.target = ThreeDActionCopy.BlankTarget
      a.rel = ThreeDActionCopy.NoopenerRel
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      toast.error(ThreeDActionCopy.DownloadFailed)
    }
  }

  const handleRegenerate = () => {
    deps.setModelUrl(undefined)
    deps.setGenerationResult(null)
    deps.setProgress(0)
    deps.setMeshyTaskId(null)
  }

  const handleStopGeneration = async () => {
    await deps.clearGenerationState(GenerationStatus.Failed)
    toast(ThreeDActionCopy.GenStopped, { icon: ThreeDPollCopy.InfoIcon })
  }

  const handleRemesh = async () => {
    if (!deps.meshyTaskId) {
      toast.error(ThreeDActionCopy.RemeshNeedModel)
      return
    }

    deps.setIsRemeshing(true)
    deps.setRemeshProgress(0)
    deps.setShowRemeshSettings(false)

    try {
      const apiKey = browserStorage.getAiApiKey(providerConfigKey(deps.provider))
      toast.loading(ThreeDActionCopy.RemeshStarting)

      const { runId } = await trigger3dRemesh({
        assetId: deps.assetId,
        meshyTaskId: deps.meshyTaskId,
        apiKey,
        topology: deps.remeshTopology,
        targetPolycount: deps.remeshPolycount,
        resizeHeight: deps.remeshHeight ? parseFloat(deps.remeshHeight) : undefined,
      })

      toast.dismiss()
      toast.success(ThreeDActionCopy.RemeshStarted)

      await deps.saveMetadata({
        remeshRunId: runId,
        remeshStatus: GenerationStatus.Processing,
      })

      deps.setRemeshRunId(runId)
      useGlobalStatusStore.getState().addOperation({
        id: `${ThreeDOperationIdPrefix.Remesh}${deps.assetId}`,
        type: ThreeDOperationType.Remesh,
        label: ThreeDOperationLabel.Remeshing,
        details: `Meshy - ${ThreeDActionCopy.InProgressDetails}`,
        status: AsyncOperationStatus.InProgress,
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`${ThreeDActionCopy.RemeshFailedStart} ${getErrorMessage(error)}`)
      deps.setIsRemeshing(false)
    }
  }

  const handleStopRemesh = async () => {
    await deps.clearRemeshState(GenerationStatus.Failed)
    toast(ThreeDActionCopy.RemeshStopped, { icon: ThreeDPollCopy.InfoIcon })
  }

  const handleUpload = async () => {
    if (!deps.currentProject) return
    if (!deps.modelUrl) {
      toast.error(ThreeDActionCopy.UploadNoModel)
      return
    }

    const filename = deps.modelUrl.split('/').pop()
    if (!filename) {
      toast.error(ThreeDActionCopy.UploadInvalidUrl)
      return
    }

    deps.setIsUploading(true)
    deps.setUploadProgress(0)

    try {
      toast.loading(ThreeDActionCopy.UploadStarting)
      const { runId } = await triggerModelUpload({
        projectId: deps.currentProject.id,
        assetId: deps.assetId,
        modelFilename: filename,
      })

      toast.dismiss()
      toast.success(ThreeDActionCopy.UploadStarted)
      deps.setUploadRunId(runId)
      useGlobalStatusStore.getState().addOperation({
        id: `${ThreeDActionCopy.UploadOpIdPrefix}${deps.assetId}`,
        type: ThreeDActionCopy.UploadOpType,
        label: ThreeDActionCopy.UploadOpLabel,
        details: ThreeDActionCopy.InProgressDetails,
        status: AsyncOperationStatus.InProgress,
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`${ThreeDActionCopy.UploadFailedStart} ${getErrorMessage(error)}`)
      deps.setIsUploading(false)
    }
  }

  const handleStopUpload = async () => {
    await deps.clearUploadState(GenerationStatus.Failed)
    toast(ThreeDActionCopy.UploadStopped, { icon: ThreeDPollCopy.InfoIcon })
  }

  return {
    handleRecoverFromMeshy,
    handleGenerate,
    handleDownload,
    handleRegenerate,
    handleStopGeneration,
    handleRemesh,
    handleStopRemesh,
    handleUpload,
    handleStopUpload,
  }
}
