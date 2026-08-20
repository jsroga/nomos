'use client'

import React, { useState, useEffect, useRef } from 'react'
import { AIProvider } from '@/shared/types/enums'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { patchAsset, fetchAsset } from '../core/io/asset-exporter.api'
import {
  parseGenerationMetadata,
  type GenerationMetadata,
  type MeshyResult,
  MeshyTopology,
} from '../core/types/three-d-generation'
import { useThreeDRunPolling } from '../state/hooks/useThreeDRunPolling'
import { hydrateThreeDAsset } from '../state/utils/hydrate-three-d-asset'
import { readAssetModelFilename } from '../state/utils/read-asset-model-filename'
import {
  applyHydratedStaticFields,
  resolveHydratedGenerationRun,
  shouldResumeGeneration,
} from '../state/utils/apply-hydrated-three-d-asset'
import { createThreeDPanelActions } from '../state/hooks/create-three-d-panel-actions'
import { ThreeDPanelView } from './ThreeDPanelView'
import { ThreeDOperationIdPrefix } from '../constants/three-d-operation-wire'
import { ThreeDPanelLog } from '../constants/three-d-panel-log'
import { ThreeDPollCopy } from '../constants/three-d-poll-copy'

interface ThreeDPanelProps {
  assetId: string
  imageUrl: string
  initialModelUrl?: string
  projectId: string
  user: unknown
  onUpdateAsset?: (id: string, patch: { model_filename?: string }) => void
}

export const ThreeDPanel: React.FC<ThreeDPanelProps> = ({
  assetId,
  imageUrl,
  initialModelUrl,
  projectId,
  user,
  onUpdateAsset,
}) => {
  const [modelUrl, setModelUrl] = useState<string | undefined>(initialModelUrl)
  const [provider, setProvider] = useState<AIProvider>(AIProvider.Meshy)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [generationResult, setGenerationResult] = useState<MeshyResult | null>(null)
  const [meshyTaskId, setMeshyTaskId] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [topology, setTopology] = useState<MeshyTopology>(MeshyTopology.Triangle)
  const [targetPolycount, setTargetPolycount] = useState<number>(30000)
  const [showSettings, setShowSettings] = useState(false)
  const [isRemeshing, setIsRemeshing] = useState(false)
  const [remeshRunId, setRemeshRunId] = useState<string | null>(null)
  const [remeshProgress, setRemeshProgress] = useState(0)
  const [remeshModelUrl, setRemeshModelUrl] = useState<string | null>(null)
  const [remeshResult, setRemeshResult] = useState<MeshyResult | null>(null)
  const [showRemeshed, setShowRemeshed] = useState(false)
  const [showRemeshSettings, setShowRemeshSettings] = useState(false)
  const [remeshTopology, setRemeshTopology] = useState<MeshyTopology>(MeshyTopology.Triangle)
  const [remeshPolycount, setRemeshPolycount] = useState(30000)
  const [remeshHeight, setRemeshHeight] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadRunId, setUploadRunId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const isMounted = useRef(true)
  const currentProject = { id: projectId }

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const saveMetadata = async (newMetadata: Partial<GenerationMetadata>) => {
    try {
      await patchAsset(assetId, { metadata: newMetadata })
    } catch (err) {
      console.error(ThreeDPanelLog.SaveMetadataFailed, err)
    }
  }

  const updateAssetViaApi = async (updates: {
    model_filename?: string
    metadata?: Partial<GenerationMetadata>
  }) => {
    try {
      await patchAsset(assetId, updates)
    } catch (err) {
      console.error(ThreeDPanelLog.UpdateAssetFailed, err)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadAssetData = async () => {
      if (!assetId) return
      try {
        const data = await fetchAsset(assetId)
        if (cancelled) return

        const existingMetadata = parseGenerationMetadata(data?.metadata)
        const optimisticRunId = shouldResumeGeneration(existingMetadata)
        if (optimisticRunId) {
          setIsGenerating(true)
        }

        const hydrated = await hydrateThreeDAsset({
          assetId,
          hasModelUrl: Boolean(initialModelUrl),
          metadataRaw: data?.metadata,
          modelFilenameRaw: readAssetModelFilename(data),
          saveMetadata: async newMetadata => {
            try {
              await patchAsset(assetId, { metadata: newMetadata })
            } catch (err) {
              console.error(ThreeDPanelLog.SaveMetadataFailed, err)
            }
          },
        })
        if (cancelled) return

        applyHydratedStaticFields(hydrated, {
          setModelUrl,
          setGenerationResult,
          setMeshyTaskId,
          setRemeshResult,
          setRemeshModelUrl,
        })
        const generationRun = resolveHydratedGenerationRun(
          hydrated.resumeGenerationRunId,
          Boolean(optimisticRunId),
        )
        if (generationRun) {
          setCurrentRunId(generationRun.runId)
          setIsGenerating(generationRun.isGenerating)
        }
        if (hydrated.resumeRemeshRunId) {
          setRemeshRunId(hydrated.resumeRemeshRunId)
          setIsRemeshing(true)
        }
      } catch (err) {
        if (err instanceof ClientFetchError && err.status === HttpStatus.NOT_FOUND) return
        console.error(ThreeDPanelLog.LoadAssetFailed, err)
      }
    }

    void loadAssetData()
    return () => {
      cancelled = true
    }
  }, [assetId, initialModelUrl])

  const clearGenerationState = async (
    status: typeof ThreeDPollCopy.Completed | typeof ThreeDPollCopy.Failed = ThreeDPollCopy.Failed
  ) => {
    setIsGenerating(false)
    setCurrentRunId(null)
    setProgress(0)
    useGlobalStatusStore.getState().removeOperation(`${ThreeDOperationIdPrefix.Generation}${assetId}`)
    await saveMetadata({ generation_status: status })
  }

  const clearRemeshState = async (
    status: typeof ThreeDPollCopy.Completed | typeof ThreeDPollCopy.Failed = ThreeDPollCopy.Failed
  ) => {
    setIsRemeshing(false)
    setRemeshRunId(null)
    setRemeshProgress(0)
    useGlobalStatusStore.getState().removeOperation(`${ThreeDOperationIdPrefix.Remesh}${assetId}`)
    await saveMetadata({ remesh_status: status })
  }

  const clearUploadState = async (
    _status: typeof ThreeDPollCopy.Completed | typeof ThreeDPollCopy.Failed = ThreeDPollCopy.Failed
  ) => {
    setIsUploading(false)
    setUploadRunId(null)
    setUploadProgress(0)
    useGlobalStatusStore.getState().removeOperation(`${ThreeDPanelLog.UploadOpPrefix}${assetId}`)
  }

  useThreeDRunPolling({
    assetId,
    isMounted,
    currentRunId,
    remeshRunId,
    uploadRunId,
    meshyTaskId,
    setMeshyTaskId,
    setProgress,
    setRemeshProgress,
    setUploadProgress,
    setModelUrl,
    setGenerationResult,
    setRemeshModelUrl,
    setRemeshResult,
    setShowRemeshed,
    setIsGenerating,
    setCurrentRunId,
    setIsRemeshing,
    setRemeshRunId,
    setIsUploading,
    setUploadRunId,
    saveMetadata,
    updateAssetViaApi,
    updateAsset: onUpdateAsset,
    clearGenerationState,
    clearRemeshState,
    clearUploadState,
  })

  const actions = createThreeDPanelActions({
    assetId,
    imageUrl,
    provider,
    topology,
    targetPolycount,
    remeshTopology,
    remeshPolycount,
    remeshHeight,
    meshyTaskId,
    modelUrl,
    currentProject,
    user,
    updateAsset: onUpdateAsset,
    saveMetadata,
    updateAssetViaApi,
    setModelUrl,
    setGenerationResult,
    setMeshyTaskId,
    setIsRecovering,
    setIsGenerating,
    setCurrentRunId,
    setProgress,
    setIsRemeshing,
    setRemeshProgress,
    setShowRemeshSettings,
    setRemeshRunId,
    setIsUploading,
    setUploadProgress,
    setUploadRunId,
    clearGenerationState,
    clearRemeshState,
    clearUploadState,
  })

  return (
    <ThreeDPanelView
      modelUrl={modelUrl}
      provider={provider}
      setProvider={setProvider}
      isGenerating={isGenerating}
      progress={progress}
      generationResult={generationResult}
      meshyTaskId={meshyTaskId}
      isRecovering={isRecovering}
      topology={topology}
      setTopology={setTopology}
      targetPolycount={targetPolycount}
      setTargetPolycount={setTargetPolycount}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      isRemeshing={isRemeshing}
      remeshProgress={remeshProgress}
      remeshModelUrl={remeshModelUrl}
      remeshResult={remeshResult}
      showRemeshed={showRemeshed}
      setShowRemeshed={setShowRemeshed}
      showRemeshSettings={showRemeshSettings}
      setShowRemeshSettings={setShowRemeshSettings}
      remeshTopology={remeshTopology}
      setRemeshTopology={setRemeshTopology}
      remeshPolycount={remeshPolycount}
      setRemeshPolycount={setRemeshPolycount}
      remeshHeight={remeshHeight}
      setRemeshHeight={setRemeshHeight}
      imageUrl={imageUrl}
      handleRecoverFromMeshy={actions.handleRecoverFromMeshy}
      handleGenerate={actions.handleGenerate}
      handleDownload={actions.handleDownload}
      handleRegenerate={actions.handleRegenerate}
      handleStopGeneration={actions.handleStopGeneration}
      handleRemesh={actions.handleRemesh}
      handleStopRemesh={actions.handleStopRemesh}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      handleUpload={actions.handleUpload}
      handleStopUpload={actions.handleStopUpload}
    />
  )
}
