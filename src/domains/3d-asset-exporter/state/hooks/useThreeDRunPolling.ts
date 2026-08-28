'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { fetchTrigger3dRunStatus } from '../../core/io/asset-exporter.api'
import {
  GenerationStatus,
  readMeshyResultFromOutput,
  readMeshyTaskId,
  readStatusErrorMessage,
  type MeshyResult,
} from '../../core/types/three-d-generation'
import { pollTrigger3dRun } from '../utils/poll-trigger-3d-run'
import { logPollErrorUnlessAborted } from '../utils/log-poll-error-unless-aborted'
import { readRunProgress } from '../utils/read-run-progress'
import {
  THREE_D_TRIGGER_MAX_POLLS,
  THREE_D_TRIGGER_POLL_INTERVAL_MS,
} from '../../constants/three-d-polling'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { ThreeDPollCopy, ThreeDPollToast } from '../../constants/three-d-poll-copy'

export interface ThreeDPollSaveMetadata {
  (newMetadata: Record<string, unknown>): Promise<void>
}

export interface ThreeDPollUpdateAsset {
  (updates: {
    model_filename?: string
    metadata?: Record<string, unknown>
  }): Promise<void>
}

export interface UseThreeDRunPollingParams {
  assetId: string
  isMounted: React.MutableRefObject<boolean>
  currentRunId: string | null
  remeshRunId: string | null
  uploadRunId: string | null
  meshyTaskId: string | null
  setMeshyTaskId: (id: string | null) => void
  setProgress: (n: number) => void
  setRemeshProgress: (n: number) => void
  setUploadProgress: (n: number) => void
  setModelUrl: (url: string | undefined) => void
  setGenerationResult: (result: MeshyResult | null) => void
  setRemeshModelUrl: (url: string | null) => void
  setRemeshResult: (result: MeshyResult | null) => void
  setShowRemeshed: (show: boolean) => void
  setIsGenerating: (v: boolean) => void
  setCurrentRunId: (id: string | null) => void
  setIsRemeshing: (v: boolean) => void
  setRemeshRunId: (id: string | null) => void
  setIsUploading: (v: boolean) => void
  setUploadRunId: (id: string | null) => void
  saveMetadata: ThreeDPollSaveMetadata
  updateAssetViaApi: ThreeDPollUpdateAsset
  updateAsset?: (id: string, patch: { model_filename?: string }) => void
  clearGenerationState: (status?: GenerationStatus) => Promise<void>
  clearRemeshState: (status?: GenerationStatus) => Promise<void>
  clearUploadState: (status?: GenerationStatus) => Promise<void>
}

export function useThreeDRunPolling(params: UseThreeDRunPollingParams): void {
  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  })

  const { currentRunId, remeshRunId, uploadRunId, assetId } = params

  useEffect(() => {
    if (!currentRunId) return
    let aborted = false
    const p = () => paramsRef.current

    void pollTrigger3dRun(
      currentRunId,
      fetchTrigger3dRunStatus,
      {
        shouldAbort: () => aborted || !p().isMounted.current,
        onPoll: statusData => {
          const metadata = statusData.metadata ?? {}
          const taskId = readMeshyTaskId(metadata)
          if (taskId && !p().meshyTaskId) {
            p().setMeshyTaskId(taskId)
            void p().saveMetadata({ meshy_task_id: taskId })
          }
          const progress = readRunProgress(metadata)
          if (progress !== undefined && p().isMounted.current) {
            p().setProgress(progress)
          }
        },
        on404: async () => {
          p().setIsGenerating(false)
          p().setCurrentRunId(null)
          useGlobalStatusStore.getState().removeOperation(`3d-${assetId}`)
          await p().saveMetadata({ generation_status: GenerationStatus.Failed })
          if (p().meshyTaskId) {
            toast(ThreeDPollCopy.RecoverHint, {
              icon: ThreeDPollCopy.WarnIcon,
              duration: 5000,
            })
          } else {
            toast(ThreeDPollCopy.PreviousNotFound, { icon: ThreeDPollCopy.InfoIcon })
          }
        },
        onCompleted: async statusData => {
          const output = statusData.output
          const modelUrlOut = output && typeof output.modelUrl === 'string' ? output.modelUrl : null
          if (modelUrlOut && p().isMounted.current) {
            p().setModelUrl(modelUrlOut)
            const meshyResult = readMeshyResultFromOutput(output)
            if (meshyResult) p().setGenerationResult(meshyResult)
            await p().updateAssetViaApi({
              model_filename: modelUrlOut,
              metadata: {
                generation_status: GenerationStatus.Completed,
                meshy_task_id: readMeshyTaskId(statusData.metadata) || p().meshyTaskId || undefined,
                generation_result: meshyResult,
              },
            })
            const updateAsset = p().updateAsset
            if (updateAsset) {
              updateAsset(assetId, { model_filename: modelUrlOut.split('/').pop() })
            }
            toast.success(ThreeDPollCopy.GenSuccess)
          }
          await p().clearGenerationState(GenerationStatus.Completed)
        },
        onFailed: async statusData => {
          const storedMeshyId = readMeshyTaskId(statusData.metadata) || p().meshyTaskId
          if (storedMeshyId) {
            p().setMeshyTaskId(storedMeshyId)
            await p().saveMetadata({
              generation_status: GenerationStatus.Failed,
              meshy_task_id: storedMeshyId,
            })
            toast.error(ThreeDPollToast.MeshyIdSaved, { duration: 8000 })
          } else {
            toast.error(
              `Generation Failed: ${readStatusErrorMessage(
                statusData.error,
                `Generation ended with status: ${statusData.status ?? ThreeDPollCopy.UnknownStatus}`
              )}`
            )
          }
          p().setIsGenerating(false)
          p().setCurrentRunId(null)
          useGlobalStatusStore.getState().removeOperation(`3d-${assetId}`)
        },
      },
      { intervalMs: THREE_D_TRIGGER_POLL_INTERVAL_MS, maxPolls: THREE_D_TRIGGER_MAX_POLLS }
    ).catch(error => {
      logPollErrorUnlessAborted(ThreeDPollCopy.PollGenError, error)
    })

    return () => {
      aborted = true
    }
  }, [currentRunId, assetId])

  useEffect(() => {
    if (!remeshRunId) return
    let aborted = false
    const p = () => paramsRef.current

    void pollTrigger3dRun(
      remeshRunId,
      fetchTrigger3dRunStatus,
      {
        shouldAbort: () => aborted || !p().isMounted.current,
        onPoll: statusData => {
          const progress = readRunProgress(statusData.metadata)
          if (progress !== undefined && p().isMounted.current) {
            p().setRemeshProgress(progress)
          }
        },
        on404: async () => {
          await p().clearRemeshState(GenerationStatus.Failed)
          toast(ThreeDPollCopy.RemeshNotFound, { icon: ThreeDPollCopy.InfoIcon })
        },
        onCompleted: async statusData => {
          const output = statusData.output
          const modelUrlOut = output && typeof output.modelUrl === 'string' ? output.modelUrl : null
          if (modelUrlOut && p().isMounted.current) {
            p().setRemeshModelUrl(modelUrlOut)
            p().setShowRemeshed(true)
            const meshyResult = readMeshyResultFromOutput(output)
            if (meshyResult) p().setRemeshResult(meshyResult)
            toast.success(ThreeDPollCopy.RemeshSuccess)
          }
          await p().clearRemeshState(GenerationStatus.Completed)
        },
        onFailed: async statusData => {
          toast.error(
            `Remesh Failed: ${readStatusErrorMessage(
              statusData.error,
              `Remesh ended with status: ${statusData.status ?? ThreeDPollCopy.UnknownStatus}`
            )}`
          )
          await p().clearRemeshState(GenerationStatus.Failed)
        },
      },
      { intervalMs: THREE_D_TRIGGER_POLL_INTERVAL_MS, maxPolls: THREE_D_TRIGGER_MAX_POLLS }
    ).catch(error => {
      logPollErrorUnlessAborted(ThreeDPollCopy.PollRemeshError, error)
    })

    return () => {
      aborted = true
    }
  }, [remeshRunId, assetId])

  useEffect(() => {
    if (!uploadRunId) return
    let aborted = false
    const p = () => paramsRef.current

    void pollTrigger3dRun(
      uploadRunId,
      fetchTrigger3dRunStatus,
      {
        shouldAbort: () => aborted || !p().isMounted.current,
        onPoll: statusData => {
          const progress = readRunProgress(statusData.metadata)
          if (progress !== undefined && p().isMounted.current) {
            p().setUploadProgress(progress)
          }
        },
        on404: async () => {
          await p().clearUploadState(GenerationStatus.Failed)
          toast(ThreeDPollCopy.UploadNotFound, { icon: ThreeDPollCopy.InfoIcon })
        },
        onCompleted: async statusData => {
          const output = statusData.output
          const blobUrl = output && typeof output.blobUrl === 'string' ? output.blobUrl : null
          if (blobUrl && p().isMounted.current) {
            p().setModelUrl(blobUrl)
            const updateAsset = p().updateAsset
            if (updateAsset) {
              updateAsset(assetId, { model_filename: blobUrl })
            }
            toast.success(ThreeDPollCopy.UploadSuccess)
          }
          await p().clearUploadState(GenerationStatus.Completed)
        },
        onFailed: async statusData => {
          toast.error(
            `Upload Failed: ${readStatusErrorMessage(
              statusData.error,
              `Upload ended with status: ${statusData.status ?? ThreeDPollCopy.UnknownStatus}`
            )}`
          )
          await p().clearUploadState(GenerationStatus.Failed)
        },
      },
      { intervalMs: POLLING_INTERVALS.DEFAULT, maxPolls: 120 }
    ).catch(error => {
      logPollErrorUnlessAborted(ThreeDPollCopy.PollUploadError, error)
    })

    return () => {
      aborted = true
    }
  }, [uploadRunId, assetId])
}
