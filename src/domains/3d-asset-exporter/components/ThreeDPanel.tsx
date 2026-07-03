/* eslint-disable */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Box,
  Loader2,
  Cuboid,
  Download,
  Image as ImageIcon,
  XCircle,
  RefreshCw,
  Settings,
  Layers,
  ToggleLeft,
  ToggleRight,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import { AIProvider } from '@/types/enums'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { LocalStorageKeys } from '@/constants/localStorage'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Dynamic import with SSR disabled to avoid React reconciler issues
const ThreeDViewer = dynamic(
  () => import('./ThreeDViewer').then(mod => ({ default: mod.ThreeDViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    ),
  }
)

// Meshy result type
interface MeshyResult {
  model_url?: string
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    usdz?: string
    mtl?: string
  }
  texture_urls?: Array<{
    base_color?: string
    metallic?: string
    normal?: string
    roughness?: string
  }>
  thumbnail_url?: string
  progress?: number
  status?: string
}

// Generation metadata stored in Supabase
interface GenerationMetadata {
  trigger_run_id?: string
  meshy_task_id?: string
  generation_status?: 'pending' | 'processing' | 'completed' | 'failed'
  generation_started_at?: string
  generation_result?: MeshyResult
  provider?: string
  // Generation settings
  topology?: 'quad' | 'triangle'
  target_polycount?: number
  // Remesh fields
  remesh_run_id?: string
  remesh_status?: 'pending' | 'processing' | 'completed' | 'failed'
  remesh_meshy_task_id?: string
  remesh_result?: MeshyResult
}

interface ThreeDPanelProps {
  assetId: string
  imageUrl: string
  initialModelUrl?: string
}

// Active statuses that indicate the run is still processing
const ACTIVE_STATUSES = [
  'PENDING',
  'QUEUED',
  'EXECUTING',
  'WAITING',
  'REATTEMPTING',
  'FROZEN',
  'PENDING_VERSION',
]

export const ThreeDPanel: React.FC<ThreeDPanelProps> = ({ assetId, imageUrl, initialModelUrl }) => {
  const [modelUrl, setModelUrl] = useState<string | undefined>(initialModelUrl)
  const [provider, setProvider] = useState<AIProvider>(AIProvider.Meshy)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [generationResult, setGenerationResult] = useState<MeshyResult | null>(null)
  const [meshyTaskId, setMeshyTaskId] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)

  // Generation settings (Meshy)
  const [topology, setTopology] = useState<'quad' | 'triangle'>('triangle')
  const [targetPolycount, setTargetPolycount] = useState<number>(30000)
  const [showSettings, setShowSettings] = useState(false)

  // Remesh state
  const [isRemeshing, setIsRemeshing] = useState(false)
  const [remeshRunId, setRemeshRunId] = useState<string | null>(null)
  const [remeshProgress, setRemeshProgress] = useState(0)
  const [remeshModelUrl, setRemeshModelUrl] = useState<string | null>(null)
  const [remeshResult, setRemeshResult] = useState<MeshyResult | null>(null)
  const [showRemeshed, setShowRemeshed] = useState(false)
  const [showRemeshSettings, setShowRemeshSettings] = useState(false)
  // Remesh settings
  const [remeshTopology, setRemeshTopology] = useState<'quad' | 'triangle'>('triangle')
  const [remeshPolycount, setRemeshPolycount] = useState(30000)
  const [remeshHeight, setRemeshHeight] = useState<string>('')

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadRunId, setUploadRunId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const isMounted = useRef(true)
  const currentProject = useWorldStore(state => state.currentProject)
  const updateAsset = useWorldStore(state => state.updateAsset)
  const user = useWorldStore(state => state.user)

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Save metadata via API (auto-merges with existing)
  const saveMetadata = async (newMetadata: Partial<GenerationMetadata>) => {
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: newMetadata }),
      })
      if (!response.ok) {
        console.error('Failed to save metadata:', await response.text())
      }
    } catch (err) {
      console.error('Error saving metadata:', err)
    }
  }

  // Update asset via API
  const updateAssetViaApi = async (updates: {
    model_filename?: string
    metadata?: Partial<GenerationMetadata>
  }) => {
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        console.error('Failed to update asset:', await response.text())
      }
    } catch (err) {
      console.error('Error updating asset:', err)
    }
  }

  // Load asset data on mount via API
  useEffect(() => {
    const loadAssetData = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}`)
        if (!response.ok) {
          console.error('Failed to load asset:', response.status)
          return
        }

        const data = await response.json()
        if (!isMounted.current) return

        // If we have a model_filename, use it
        if (data?.model_filename && !modelUrl) {
          setModelUrl(data.model_filename)
        }

        const metadata = data?.metadata as GenerationMetadata | null
        if (!metadata) return

        // Restore generation result if available
        if (metadata.generation_result) {
          setGenerationResult(metadata.generation_result)
        }

        // Store meshy_task_id for potential recovery
        if (metadata.meshy_task_id) {
          setMeshyTaskId(metadata.meshy_task_id)
        }

        // If there's an active generation, verify it's still active before resuming
        if (metadata.trigger_run_id && metadata.generation_status === 'processing') {
          // Verify the run actually exists and is active before resuming
          try {
            const statusResponse = await fetch(
              `/api/trigger-3d/status?runId=${metadata.trigger_run_id}`
            )

            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              const status = statusData.status

              // Only resume if the run is actually active
              if (ACTIVE_STATUSES.includes(status)) {
                setCurrentRunId(metadata.trigger_run_id)
                setIsGenerating(true)

                useGlobalStatusStore.getState().addOperation({
                  id: `3d-${assetId}`,
                  type: '3d-gen',
                  label: 'Generating 3D Model',
                  details: `${metadata.provider || 'Meshy'} - Resuming...`,
                  status: 'in-progress',
                })
              } else {
                // Run completed/failed - update metadata to reflect actual status
                console.log(
                  `Generation run ${metadata.trigger_run_id} is no longer active (status: ${status}), cleaning up metadata`
                )
                await saveMetadata({
                  generation_status: status === 'COMPLETED' ? 'completed' : 'failed',
                })
              }
            } else if (statusResponse.status === 404) {
              // Run doesn't exist - mark as failed in metadata
              console.log(
                `Generation run ${metadata.trigger_run_id} not found (404), marking as failed`
              )
              await saveMetadata({
                generation_status: 'failed',
              })
            }
          } catch (err) {
            console.error('Error verifying generation run status:', err)
            // If we can't verify, mark as failed to prevent stuck state
            await saveMetadata({
              generation_status: 'failed',
            })
          }
        }

        // Restore remesh result if available
        if (metadata.remesh_result) {
          setRemeshResult(metadata.remesh_result)
          if (metadata.remesh_result.model_urls?.glb) {
            setRemeshModelUrl(metadata.remesh_result.model_urls.glb)
          }
        }

        // If there's an active remesh, verify it's still active before resuming
        if (metadata.remesh_run_id && metadata.remesh_status === 'processing') {
          // Verify the run actually exists and is active before resuming
          try {
            const statusResponse = await fetch(
              `/api/trigger-3d/status?runId=${metadata.remesh_run_id}`
            )

            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              const status = statusData.status

              // Only resume if the run is actually active
              if (ACTIVE_STATUSES.includes(status)) {
                setRemeshRunId(metadata.remesh_run_id)
                setIsRemeshing(true)

                useGlobalStatusStore.getState().addOperation({
                  id: `3d-remesh-${assetId}`,
                  type: '3d-remesh',
                  label: 'Remeshing 3D Model',
                  details: 'Meshy - Resuming...',
                  status: 'in-progress',
                })
              } else {
                // Run completed/failed - update metadata to reflect actual status
                console.log(
                  `Remesh run ${metadata.remesh_run_id} is no longer active (status: ${status}), cleaning up metadata`
                )
                await saveMetadata({
                  remesh_status: status === 'COMPLETED' ? 'completed' : 'failed',
                })
              }
            } else if (statusResponse.status === 404) {
              // Run doesn't exist - mark as failed in metadata
              console.log(`Remesh run ${metadata.remesh_run_id} not found (404), marking as failed`)
              await saveMetadata({
                remesh_status: 'failed',
              })
            }
          } catch (err) {
            console.error('Error verifying remesh run status:', err)
            // If we can't verify, mark as failed to prevent stuck state
            await saveMetadata({
              remesh_status: 'failed',
            })
          }
        }
      } catch (err) {
        console.error('Error loading asset data:', err)
      }
    }

    loadAssetData()
  }, [assetId])

  // Helper to clear generation state
  const clearGenerationState = async (status: 'completed' | 'failed' = 'failed') => {
    if (!isMounted.current) return
    setIsGenerating(false)
    setCurrentRunId(null)
    setProgress(0)
    useGlobalStatusStore.getState().removeOperation(`3d-${assetId}`)

    await saveMetadata({
      generation_status: status,
    })
  }

  // Helper to clear remesh state
  const clearRemeshState = async (status: 'completed' | 'failed' = 'failed') => {
    if (!isMounted.current) return
    setIsRemeshing(false)
    setRemeshRunId(null)
    setRemeshProgress(0)
    useGlobalStatusStore.getState().removeOperation(`3d-remesh-${assetId}`)

    await saveMetadata({
      remesh_status: status,
    })
  }

  // Try to recover asset from Meshy using stored task ID
  const handleRecoverFromMeshy = async () => {
    if (!meshyTaskId) {
      toast.error('No Meshy task ID found')
      return
    }

    setIsRecovering(true)
    toast.loading('Attempting to recover from Meshy...')

    try {
      const configKey =
        provider === AIProvider.Meshy
          ? LocalStorageKeys.AI_CONFIG_MESHY
          : LocalStorageKeys.AI_CONFIG_HYPER3D
      const savedConfig = localStorage.getItem(configKey)
      if (!savedConfig) {
        throw new Error('No Meshy API key found. Set it in Settings.')
      }
      const apiKey = JSON.parse(savedConfig).apiKey

      const response = await fetch(`https://api.meshy.ai/v1/image-to-3d/${meshyTaskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        throw new Error(`Meshy API error: ${response.status}`)
      }

      const result = await response.json()
      toast.dismiss()

      if (result.status === 'SUCCEEDED') {
        const recoveredUrl = result.model_urls?.glb || result.model_url

        setModelUrl(recoveredUrl)
        setGenerationResult(result)

        await updateAssetViaApi({
          model_filename: recoveredUrl,
          metadata: {
            generation_status: 'completed',
            meshy_task_id: meshyTaskId,
            generation_result: result,
          },
        })

        if (updateAsset) {
          updateAsset(assetId, { model_filename: recoveredUrl })
        }

        toast.success('Asset recovered successfully!')
      } else if (result.status === 'FAILED') {
        toast.error(`Meshy task failed: ${result.error || 'Unknown error'}`)
      } else {
        toast(`Meshy task status: ${result.status}. Progress: ${result.progress}%`, { icon: 'ℹ️' })
      }
    } catch (err: unknown) {
      toast.dismiss()
      toast.error(`Recovery failed: ${getErrorMessage(err)}`)
    } finally {
      setIsRecovering(false)
    }
  }

  // Poll generation task status
  useEffect(() => {
    if (!currentRunId) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/trigger-3d/status?runId=${currentRunId}`)

        if (!response.ok) {
          if (response.status === 404) {
            console.log('Run no longer exists')
            setIsGenerating(false)
            setCurrentRunId(null)
            useGlobalStatusStore.getState().removeOperation(`3d-${assetId}`)

            // Update metadata to mark as failed so it doesn't get re-added on next page load
            await saveMetadata({
              generation_status: 'failed',
            })

            if (meshyTaskId) {
              toast('Task not found. Click "Recover" to try fetching from Meshy.', {
                icon: '⚠️',
                duration: 5000,
              })
            } else {
              toast('Previous generation task not found.', { icon: 'ℹ️' })
            }
          }
          return
        }

        const data = await response.json()
        const status = data.status

        if (data.metadata?.meshy_task_id && !meshyTaskId) {
          setMeshyTaskId(data.metadata.meshy_task_id)
          await saveMetadata({
            meshy_task_id: data.metadata.meshy_task_id,
          })
        }

        if (data.metadata?.progress !== undefined && isMounted.current) {
          setProgress(data.metadata.progress)
        }

        if (status === 'COMPLETED') {
          const output = data.output
          if (output?.modelUrl && isMounted.current) {
            setModelUrl(output.modelUrl)

            if (output.result) {
              setGenerationResult(output.result)
            }

            await updateAssetViaApi({
              model_filename: output.modelUrl,
              metadata: {
                generation_status: 'completed',
                meshy_task_id: data.metadata?.meshy_task_id || meshyTaskId,
                generation_result: output.result,
              },
            })

            if (updateAsset) {
              updateAsset(assetId, { model_filename: output.modelUrl.split('/').pop() })
            }

            toast.success('3D Model generated successfully!')
          }

          await clearGenerationState('completed')
        } else if (!ACTIVE_STATUSES.includes(status)) {
          const storedMeshyId = data.metadata?.meshy_task_id || meshyTaskId

          if (storedMeshyId) {
            setMeshyTaskId(storedMeshyId)
            await saveMetadata({
              generation_status: 'failed',
              meshy_task_id: storedMeshyId,
            })

            toast.error(
              `Task failed, but Meshy ID saved. Click "Recover" to try fetching result.`,
              { duration: 8000 }
            )
          } else {
            const errorMessage = data.error?.message || `Generation ended with status: ${status}`
            toast.error(`Generation Failed: ${errorMessage}`)
          }

          setIsGenerating(false)
          setCurrentRunId(null)
          useGlobalStatusStore.getState().removeOperation(`3d-${assetId}`)
        }
      } catch (error) {
        console.error('Error polling task status:', error)
      }
    }

    checkStatus()
    const pollInterval = setInterval(checkStatus, 15000)
    return () => clearInterval(pollInterval)
  }, [currentRunId, assetId, updateAsset, meshyTaskId])

  // Poll remesh task status
  useEffect(() => {
    if (!remeshRunId) return

    const checkRemeshStatus = async () => {
      try {
        const response = await fetch(`/api/trigger-3d/status?runId=${remeshRunId}`)

        if (!response.ok) {
          if (response.status === 404) {
            console.log('Remesh run no longer exists')
            await clearRemeshState('failed')
            toast('Remesh task not found.', { icon: 'ℹ️' })
          }
          return
        }

        const data = await response.json()
        const status = data.status

        if (data.metadata?.progress !== undefined && isMounted.current) {
          setRemeshProgress(data.metadata.progress)
        }

        if (status === 'COMPLETED') {
          const output = data.output
          if (output?.modelUrl && isMounted.current) {
            setRemeshModelUrl(output.modelUrl)
            setShowRemeshed(true) // Auto-switch to remeshed view

            // Store the full result for download buttons
            if (output.result) {
              setRemeshResult(output.result)
            }

            toast.success('3D Model remeshed successfully!')
          }

          await clearRemeshState('completed')
        } else if (!ACTIVE_STATUSES.includes(status)) {
          const errorMessage = data.error?.message || `Remesh ended with status: ${status}`
          toast.error(`Remesh Failed: ${errorMessage}`)
          await clearRemeshState('failed')
        }
      } catch (error) {
        console.error('Error polling remesh status:', error)
      }
    }

    checkRemeshStatus()
    const pollInterval = setInterval(checkRemeshStatus, 15000)
    return () => clearInterval(pollInterval)
  }, [remeshRunId, assetId])

  // Poll upload task status
  useEffect(() => {
    if (!uploadRunId) return

    const checkUploadStatus = async () => {
      try {
        const response = await fetch(`/api/trigger-3d/status?runId=${uploadRunId}`)

        if (!response.ok) {
          if (response.status === 404) {
            console.log('Upload run no longer exists')
            await clearUploadState('failed')
            toast('Upload task not found.', { icon: 'ℹ️' })
          }
          return
        }

        const data = await response.json()
        const status = data.status

        if (data.metadata?.progress !== undefined && isMounted.current) {
          setUploadProgress(data.metadata.progress)
        }

        if (status === 'COMPLETED') {
          const output = data.output
          if (output?.blobUrl && isMounted.current) {
            // Update asset with new Vercel Blob URL
            setModelUrl(output.blobUrl)

            if (updateAsset) {
              updateAsset(assetId, { model_filename: output.blobUrl })
            }

            toast.success('Upload to Vercel Blob completed!')
          }

          await clearUploadState('completed')
        } else if (!ACTIVE_STATUSES.includes(status)) {
          const errorMessage = data.error?.message || `Upload ended with status: ${status}`
          toast.error(`Upload Failed: ${errorMessage}`)
          await clearUploadState('failed')
        }
      } catch (error) {
        console.error('Error polling upload status:', error)
      }
    }

    checkUploadStatus()
    const pollInterval = setInterval(checkUploadStatus, 5000) // Poll every 5s for uploads
    return () => clearInterval(pollInterval)
  }, [uploadRunId, assetId, updateAsset])

  const handleGenerate = async () => {
    if (!currentProject || !user) return

    setIsGenerating(true)
    setMeshyTaskId(null)

    try {
      const configKey =
        provider === AIProvider.Meshy
          ? LocalStorageKeys.AI_CONFIG_MESHY
          : LocalStorageKeys.AI_CONFIG_HYPER3D
      const savedConfig = localStorage.getItem(configKey)
      let apiKey = ''
      if (savedConfig) {
        apiKey = JSON.parse(savedConfig).apiKey
      }
      // Server may use MESHY_API_KEY / HYPER3D_API_KEY from env when apiKey is empty

      toast.loading('Starting 3D generation... This may take up to 15 minutes.')

      const response = await fetch('/api/trigger-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          assetId: assetId,
          imageUrl: imageUrl,
          provider: provider,
          apiKey: apiKey,
          // Meshy-specific settings
          topology: topology,
          targetPolycount: targetPolycount,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to start 3D generation')
      }

      const { runId } = await response.json()

      toast.dismiss()
      toast.success('3D generation started! Monitoring progress...')

      await saveMetadata({
        trigger_run_id: runId,
        generation_status: 'processing',
        generation_started_at: new Date().toISOString(),
        provider: provider,
      })

      setCurrentRunId(runId)

      useGlobalStatusStore.getState().addOperation({
        id: `3d-${assetId}`,
        type: '3d-gen',
        label: 'Generating 3D Model',
        details: `${provider} - In progress`,
        status: 'in-progress',
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`Failed to Start: ${getErrorMessage(error)}`)
      setIsGenerating(false)
    }
  }

  const getProxiedUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `/api/proxy-model?url=${encodeURIComponent(url)}`
    }
    return url
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const response = await fetch(getProxiedUrl(url))
        if (!response.ok) throw new Error('Download failed')
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Download failed. Try right-clicking and "Save as".')
    }
  }

  const handleRegenerate = () => {
    setModelUrl(undefined)
    setGenerationResult(null)
    setProgress(0)
    setMeshyTaskId(null)
  }

  const handleStopGeneration = async () => {
    await clearGenerationState('failed')
    toast('Generation stopped. You can start a new one.', { icon: 'ℹ️' })
  }

  // Handle remesh
  const handleRemesh = async () => {
    if (!meshyTaskId) {
      toast.error('No Meshy task ID found. Generate a model first.')
      return
    }

    setIsRemeshing(true)
    setRemeshProgress(0)
    setShowRemeshSettings(false)

    try {
      const configKey =
        provider === AIProvider.Meshy
          ? LocalStorageKeys.AI_CONFIG_MESHY
          : LocalStorageKeys.AI_CONFIG_HYPER3D
      const savedConfig = localStorage.getItem(configKey)
      let apiKey = ''
      if (savedConfig) {
        apiKey = JSON.parse(savedConfig).apiKey ?? ''
      }
      // Server may use MESHY_API_KEY from env when apiKey is empty

      toast.loading('Starting remesh... This may take a few minutes.')

      const response = await fetch('/api/trigger-3d/remesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: assetId,
          meshyTaskId: meshyTaskId,
          apiKey: apiKey,
          topology: remeshTopology,
          targetPolycount: remeshPolycount,
          resizeHeight: remeshHeight ? parseFloat(remeshHeight) : undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to start remesh')
      }

      const data = await response.json()
      const { runId } = data

      toast.dismiss()
      toast.success('Remesh started! Optimizing your 3D model...')

      await saveMetadata({
        remesh_run_id: runId,
        remesh_status: 'processing',
      })

      setRemeshRunId(runId)

      useGlobalStatusStore.getState().addOperation({
        id: `3d-remesh-${assetId}`,
        type: '3d-remesh',
        label: 'Remeshing 3D Model',
        details: 'Meshy - In progress',
        status: 'in-progress',
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`Failed to Start Remesh: ${getErrorMessage(error)}`)
      setIsRemeshing(false)
    }
  }

  const handleStopRemesh = async () => {
    await clearRemeshState('failed')
    toast('Remesh stopped.', { icon: 'ℹ️' })
  }

  // Helper to clear upload state
  const clearUploadState = async (status: 'completed' | 'failed' = 'failed') => {
    if (!isMounted.current) return
    setIsUploading(false)
    setUploadRunId(null)
    setUploadProgress(0)
    useGlobalStatusStore.getState().removeOperation(`upload-${assetId}`)
  }

  // Handle upload to Vercel Blob
  const handleUpload = async () => {
    if (!currentProject) return
    if (!modelUrl) {
      toast.error('No 3D model to upload')
      return
    }

    // Extract filename from modelUrl
    const filename = modelUrl.split('/').pop()
    if (!filename) {
      toast.error('Invalid model URL')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      toast.loading('Starting upload to Vercel Blob...')

      const response = await fetch('/api/trigger-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          assetId: assetId,
          modelFilename: filename,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to start upload')
      }

      const { runId } = await response.json()

      toast.dismiss()
      toast.success('Upload started! Monitoring progress...')

      setUploadRunId(runId)

      useGlobalStatusStore.getState().addOperation({
        id: `upload-${assetId}`,
        type: 'upload',
        label: 'Uploading to Vercel',
        details: 'In progress',
        status: 'in-progress',
      })
    } catch (error: unknown) {
      console.error(error)
      toast.dismiss()
      toast.error(`Failed to Start Upload: ${getErrorMessage(error)}`)
      setIsUploading(false)
    }
  }

  const handleStopUpload = async () => {
    await clearUploadState('failed')
    toast('Upload stopped.', { icon: 'ℹ️' })
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">3D Preview</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Recovery button when we have meshy_task_id but no model */}
          {!modelUrl && !isGenerating && meshyTaskId && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecoverFromMeshy}
              disabled={isRecovering}
              className="gap-1"
            >
              {isRecovering ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Recover
            </Button>
          )}

          {/* Generate controls */}
          {!modelUrl && !isGenerating && (
            <>
              <select
                className="h-8 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
                value={provider}
                onChange={e => setProvider(e.target.value as AIProvider)}
                disabled={isGenerating}
              >
                <option value={AIProvider.Meshy}>Meshy (Meshy 6)</option>
                <option value={AIProvider.Hyper3D}>Hyper3D</option>
              </select>

              {/* Settings toggle (Meshy only) */}
              {provider === AIProvider.Meshy && (
                <Button
                  size="sm"
                  variant={showSettings ? 'secondary' : 'ghost'}
                  onClick={() => setShowSettings(!showSettings)}
                  className="gap-1 h-8 w-8 p-0"
                  title="Generation settings"
                >
                  <Settings size={14} />
                </Button>
              )}

              <Button
                id={TOUR_STEP_IDS.GENERATE_3D_BUTTON}
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-1"
              >
                <Cuboid size={14} />
                Generate 3D
              </Button>
            </>
          )}

          {/* Stop generation */}
          {isGenerating && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStopGeneration}
              className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <XCircle size={14} />
              Stop
            </Button>
          )}

          {/* Remesh button - show when model exists and not generating/remeshing */}
          {modelUrl && !isGenerating && !isRemeshing && (
            <Button
              size="sm"
              variant={showRemeshSettings ? 'secondary' : 'outline'}
              onClick={() => setShowRemeshSettings(!showRemeshSettings)}
              className="gap-1"
              disabled={!meshyTaskId}
              title={
                !meshyTaskId
                  ? 'Generate a model first to enable remesh'
                  : 'Configure and remesh this model'
              }
            >
              <Layers size={14} />
              Remesh
            </Button>
          )}

          {/* Stop remesh */}
          {isRemeshing && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStopRemesh}
              className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <XCircle size={14} />
              Stop Remesh
            </Button>
          )}
        </div>
      </div>

      {/* Settings panel (Meshy only) */}
      {showSettings && !modelUrl && !isGenerating && provider === AIProvider.Meshy && (
        <div className="px-3 py-2 border-b border-border bg-muted/10 space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Topology:</label>
              <select
                className="h-7 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
                value={topology}
                onChange={e => setTopology(e.target.value as 'quad' | 'triangle')}
              >
                <option value="triangle">Triangle</option>
                <option value="quad">Quad</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Polycount:</label>
              <input
                type="range"
                min="100"
                max="300000"
                step="1000"
                value={targetPolycount}
                onChange={e => setTargetPolycount(Number(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                {targetPolycount >= 1000
                  ? `${(targetPolycount / 1000).toFixed(0)}k`
                  : targetPolycount}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Default: 30k polys, triangle mesh. Higher polycount = more detail but larger file.
          </p>
        </div>
      )}

      {/* Progress bar when generating */}
      {isGenerating && (
        <div className="px-3 py-2 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Generating 3D model...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Remesh settings panel */}
      {showRemeshSettings && modelUrl && !isRemeshing && (
        <div className="px-3 py-2 border-b border-border bg-blue-500/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2">
            <Layers size={12} />
            Remesh Settings
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Topology:</label>
              <select
                className="h-7 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
                value={remeshTopology}
                onChange={e => setRemeshTopology(e.target.value as 'quad' | 'triangle')}
              >
                <option value="triangle">Triangle</option>
                <option value="quad">Quad</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Polycount:</label>
              <input
                type="range"
                min="100"
                max="300000"
                step="1000"
                value={remeshPolycount}
                onChange={e => setRemeshPolycount(Number(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                {remeshPolycount >= 1000
                  ? `${(remeshPolycount / 1000).toFixed(0)}k`
                  : remeshPolycount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Height (m):</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Auto"
                value={remeshHeight}
                onChange={e => setRemeshHeight(e.target.value)}
                className="h-7 w-20 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] text-muted-foreground">
              Remesh optimizes the mesh topology and exports to multiple formats (GLB, FBX, OBJ,
              USDZ).
            </p>
            <Button
              size="sm"
              onClick={handleRemesh}
              className="gap-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Layers size={14} />
              Start Remesh
            </Button>
          </div>
        </div>
      )}

      {/* Progress bar when remeshing */}
      {isRemeshing && (
        <div className="px-3 py-2 border-b border-border bg-blue-500/10">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Layers size={12} className="text-blue-400" />
              Remeshing 3D model...
            </span>
            <span>{remeshProgress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${remeshProgress}%` }}
            />
          </div>
        </div>
      )}

      <div
        className="flex-1 relative bg-[#1a1a1a] flex flex-col items-center justify-center min-h-0"
        id={TOUR_STEP_IDS.ASSET_3D_PREVIEW}
      >
        {modelUrl ? (
          <ThreeDViewer modelUrl={showRemeshed && remeshModelUrl ? remeshModelUrl : modelUrl} />
        ) : (
          <div className="text-center p-8 text-muted-foreground space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              {isGenerating ? (
                <Loader2 size={36} className="animate-spin text-primary/60" />
              ) : (
                <Box size={36} className="text-primary/60" />
              )}
            </div>
            <h4 className="font-semibold text-lg text-foreground">No 3D Model</h4>
            <p className="text-sm max-w-[240px] mx-auto leading-relaxed">
              {isGenerating
                ? 'Generation is running in the background. This may take up to 10 minutes.'
                : meshyTaskId
                  ? 'Previous generation may have data. Click Recover to check.'
                  : 'Select a provider and click Generate to create a 3D model from your 2D asset.'}
            </p>
          </div>
        )}
      </div>

      {/* Download section when model is ready */}
      {modelUrl && (
        <div className="p-3 border-t border-border bg-muted/10 space-y-3">
          {/* Model switcher - show when remeshed version exists */}
          {remeshModelUrl && (
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Viewing:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRemeshed(false)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    !showRemeshed
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowRemeshed(true)}
                  className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                    showRemeshed
                      ? 'bg-blue-500 text-white'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <Layers size={10} />
                  Remeshed
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Download size={12} />
              Download Model{' '}
              {showRemeshed && remeshModelUrl && <span className="text-blue-400">(Remeshed)</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Show remesh download buttons when viewing remeshed version */}
              {showRemeshed && remeshResult?.model_urls ? (
                <>
                  {remeshResult.model_urls.glb && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() =>
                        handleDownload(remeshResult.model_urls!.glb!, 'model_remeshed.glb')
                      }
                    >
                      GLB (Web)
                    </Button>
                  )}
                  {remeshResult.model_urls.fbx && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() =>
                        handleDownload(remeshResult.model_urls!.fbx!, 'model_remeshed.fbx')
                      }
                    >
                      FBX (Unity)
                    </Button>
                  )}
                  {remeshResult.model_urls.obj && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() =>
                        handleDownload(remeshResult.model_urls!.obj!, 'model_remeshed.obj')
                      }
                    >
                      OBJ
                    </Button>
                  )}
                  {remeshResult.model_urls.usdz && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() =>
                        handleDownload(remeshResult.model_urls!.usdz!, 'model_remeshed.usdz')
                      }
                    >
                      USDZ (AR)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Show original download buttons */}
                  {generationResult?.model_urls?.glb && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDownload(generationResult.model_urls!.glb!, 'model.glb')}
                    >
                      GLB (Web)
                    </Button>
                  )}
                  {generationResult?.model_urls?.fbx && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDownload(generationResult.model_urls!.fbx!, 'model.fbx')}
                    >
                      FBX (Unity)
                    </Button>
                  )}
                  {generationResult?.model_urls?.obj && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDownload(generationResult.model_urls!.obj!, 'model.obj')}
                    >
                      OBJ
                    </Button>
                  )}
                  {generationResult?.model_urls?.usdz && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        handleDownload(generationResult.model_urls!.usdz!, 'model.usdz')
                      }
                    >
                      USDZ (AR)
                    </Button>
                  )}
                  {!generationResult?.model_urls && modelUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDownload(modelUrl, 'model.glb')}
                    >
                      GLB
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {generationResult?.texture_urls && generationResult.texture_urls.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon size={12} />
                Texture Maps
              </div>
              <div className="flex flex-wrap gap-2">
                {generationResult.texture_urls[0]?.base_color && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleDownload(
                        generationResult.texture_urls![0].base_color!,
                        'texture_base_color.png'
                      )
                    }
                  >
                    Base Color
                  </Button>
                )}
                {generationResult.texture_urls[0]?.normal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleDownload(
                        generationResult.texture_urls![0].normal!,
                        'texture_normal.png'
                      )
                    }
                  >
                    Normal
                  </Button>
                )}
                {generationResult.texture_urls[0]?.metallic && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleDownload(
                        generationResult.texture_urls![0].metallic!,
                        'texture_metallic.png'
                      )
                    }
                  >
                    Metallic
                  </Button>
                )}
                {generationResult.texture_urls[0]?.roughness && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleDownload(
                        generationResult.texture_urls![0].roughness!,
                        'texture_roughness.png'
                      )
                    }
                  >
                    Roughness
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border/50">
            <button onClick={handleRegenerate} className="text-xs text-primary hover:underline">
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
