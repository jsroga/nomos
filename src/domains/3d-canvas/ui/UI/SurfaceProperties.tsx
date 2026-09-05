'use client'
import { MeshyArtStyle } from '@/shared/data/constants/protocol'

import React, { useState, useEffect } from 'react'
import { interiorDesignerApi } from '@/domains/3d-canvas/core/io/interior-designer.api'
import { useInteriorStore, TextureStyle } from '@/domains/3d-canvas'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { pollInteriorTriggerRun } from '@/domains/3d-canvas/state/utils/poll-interior-trigger-run'
import { DEFAULT_TEXTURE_STYLE } from '@/domains/3d-canvas/constants/texture-defaults'
import { SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'
import { InteriorDefaultProjectId } from '@/domains/3d-canvas/constants/interior-api-defaults'
import {
  MaterialGenerationMode,
  MaterialGenerationOperationType,
  MaterialGenerationStage,
  MaterialOperationMetaKey,
  SurfaceBoundsMetaKey,
  SurfacePropertiesError,
  SurfacePropertiesLog,
  SurfacePropertiesToast,
  SurfaceRetextureOriginalType,
  SURFACE_MATERIAL_OPERATION_ID_PREFIX,
} from '@/domains/3d-canvas/constants/surface-material-generation'
import {
  isGroundSurfaceType,
  SurfaceGeometrySection,
  SurfacePropertiesHeader,
  SurfaceTerrainSection,
} from './surface-properties-sections'
import {
  SurfaceMaterialGenerationSection,
} from './surface-material-generation-section'
import { SurfacePreviewSections } from './surface-preview-sections'

type MaterialMode = MaterialGenerationMode.TwoD | MaterialGenerationMode.ThreeD

function parseOperationMeta(details: string | undefined): Record<string, unknown> | null {
  if (!details) return null
  try {
    return recordFromJson(JSON.parse(details))
  } catch {
    return null
  }
}

function readSurfaceBoundsNumber(
  bounds: unknown,
  key: SurfaceBoundsMetaKey
): number {
  const record = recordFromJson(bounds)
  const value = record[key]
  return typeof value === 'number' ? value : key === SurfaceBoundsMetaKey.Width ||
    key === SurfaceBoundsMetaKey.Depth
    ? 1
    : 0
}

export const SurfaceProperties: React.FC = () => {
  const selectedId = useInteriorStore(state => state.selectedId)
  const surfaces = useInteriorStore(state => state.surfaces)
  const updateSurface = useInteriorStore(state => state.updateSurface)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const createFloorFromSurface = useInteriorStore(state => state.createFloorFromSurface)
  const previewRetexture = useInteriorStore(state => state.previewRetexture)
  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const setGroundColor = useInteriorStore(state => state.setGroundColor)
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const setTerrainBrushPixelate = useInteriorStore(state => state.setTerrainBrushPixelate)
  const setTerrainBrushFidelity = useInteriorStore(state => state.setTerrainBrushFidelity)

  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  const { currentProject } = useProjectFromUrl()

  const selectedSurface = surfaces.find(s => s.id === selectedId)
  const [mode] = useState<MaterialMode>(MaterialGenerationMode.ThreeD)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<TextureStyle>(DEFAULT_TEXTURE_STYLE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(0.5)
  const [showPresets, setShowPresets] = useState(false)
  const [isStarting3D, setIsStarting3D] = useState(false)

  const operationId = selectedId ? `${SURFACE_MATERIAL_OPERATION_ID_PREFIX}${selectedId}` : null
  const currentOperation = operationId ? operations.find(op => op.id === operationId) : null
  const operationMeta = React.useMemo(
    () => parseOperationMeta(currentOperation?.details),
    [currentOperation?.details]
  )

  const operationMetaRef = React.useRef(operationMeta)
  useEffect(() => {
    operationMetaRef.current = operationMeta
  }, [operationMeta])

  useEffect(() => {
    if (selectedSurface) {
      setPrompt(selectedSurface.type)
      setPreviewUrl(null)
      setError(null)
      setStyle(DEFAULT_TEXTURE_STYLE)
      setScale(selectedSurface.textureScale || 0.5)
    }
  }, [selectedSurface])

  useEffect(() => {
    if (!currentOperation || !operationId) return
    if (isTerminalOperationStatus(currentOperation.status)) return

    const taskId = operationMetaRef.current?.[MaterialOperationMetaKey.TaskId]
    if (typeof taskId !== 'string') return

    let aborted = false
    void (async () => {
      try {
        await pollInteriorTriggerRun(
          () => interiorDesignerApi.material.getStatus(taskId),
      {
        shouldAbort: () => {
          if (aborted) return true
          const latestOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
          return !latestOp || isTerminalOperationStatus(latestOp.status)
        },
        onPoll: data => {
          const metadata = recordFromJson(data.metadata)
          const progress =
            typeof metadata.progress === 'number' ? metadata.progress : 0
          const stage =
            readString(metadata.stage) ?? MaterialGenerationStage.Processing

          updateOperation(operationId, {
            details: JSON.stringify({
              ...operationMetaRef.current,
              progress,
              stage,
            }),
          })
        },
        onCompleted: async data => {
          const output = recordFromJson(data.output)
          const modelUrl = readString(output.modelUrl)
          if (output.success === true && modelUrl) {
            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                ...operationMetaRef.current,
                progress: 100,
                stage: MaterialGenerationStage.Completed,
                modelUrl,
                thumbnailUrl: readString(output.thumbnailUrl),
              }),
            })
          }
        },
        onFailed: async data => {
          updateOperation(operationId, {
            status: AsyncOperationStatus.Failed,
            details: JSON.stringify({
              ...operationMetaRef.current,
              error: data.error || SurfacePropertiesError.GenerationFailed,
            }),
          })
        },
      },
          { intervalMs: POLLING_INTERVALS.DEFAULT, maxPolls: 120 }
        )
      } catch (err) {
        console.error(SurfacePropertiesLog.PollError, err)
      }
    })()

    return () => {
      aborted = true
    }
  }, [operationId, currentOperation, updateOperation])

  if (!selectedSurface) return null

  const handleGenerate2D = async () => {
    if (!prompt) return

    setIsGenerating(true)
    setError(null)
    setPreviewUrl(null)

    try {
      const apiKey = browserStorage.getString(LocalStorageKeys.STABILITY_API_KEY_LEGACY)
      if (!apiKey) {
        toast.error(SurfacePropertiesToast.StabilityApiKeyRequired)
        setIsGenerating(false)
        return
      }

      let width = 1024
      let height = 1024

      if (selectedSurface.isPath || selectedSurface.type === SurfaceTypeValue.Road) {
        width = 1536
        height = 640
      }

      const data = await interiorDesignerApi.texture.generate({
        prompt,
        apiKey,
        style,
        useSemanticSearch: true,
        width,
        height,
      })
      setPreviewUrl(data.imageUrl)
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate3D = async () => {
    if (!prompt || !operationId) return

    if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
      toast.error(SurfacePropertiesToast.GenerationInProgress)
      return
    }

    setIsStarting3D(true)
    setError(null)

    try {
      const apiKey = browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_MESHY)

      if (!apiKey) {
        toast.error(SurfacePropertiesToast.MeshyApiKeyRequired)
        setIsStarting3D(false)
        return
      }

      const xs = selectedSurface.points.map(p => p[0])
      const zs = selectedSurface.points.map(p => p[2])
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minZ = Math.min(...zs)
      const maxZ = Math.max(...zs)
      const surfaceBounds = {
        width: maxX - minX,
        depth: maxZ - minZ,
        centerX: (minX + maxX) / 2,
        centerZ: (minZ + maxZ) / 2,
      }

      addOperation({
        id: operationId,
        type: MaterialGenerationOperationType.MaterialGen,
        label: `Generating: ${prompt.slice(0, 25)}...`,
        details: JSON.stringify({
          prompt,
          surfaceId: selectedSurface.id,
          progress: 0,
          stage: MaterialGenerationStage.Starting,
        }),
        status: AsyncOperationStatus.Pending,
      })

      const data = await interiorDesignerApi.material.start({
        projectId: currentProject?.id || InteriorDefaultProjectId.Default,
        surfaceId: selectedSurface.id,
        prompt,
        apiKey,
        artStyle: MeshyArtStyle.Realistic,
        surfaceBounds,
      })

      if (data.runId) {
        updateOperation(operationId, {
          status: AsyncOperationStatus.InProgress,
          details: JSON.stringify({
            taskId: data.runId,
            prompt,
            surfaceId: selectedSurface.id,
            surfaceBounds,
            progress: 0,
            stage: MaterialGenerationStage.Preview,
          }),
        })
        toast.success(SurfacePropertiesToast.GenerationStarted)
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
      toast.error(SurfacePropertiesToast.GenerationStartFailed + getErrorMessage(e))
      if (operationId) removeOperation(operationId)
    } finally {
      setIsStarting3D(false)
    }
  }

  const handleApply2D = () => {
    if (previewUrl) {
      updateSurface(selectedSurface.id, { texture: previewUrl })
      setPreviewUrl(null)
    }
  }

  const handleApply3D = () => {
    const modelUrl = operationMeta?.[MaterialOperationMetaKey.ModelUrl]
    if (typeof modelUrl !== 'string') return

    const surfaceBounds = operationMeta?.[MaterialOperationMetaKey.SurfaceBounds]
    const updatedMeta = {
      ...operationMeta,
      originalType: SurfaceRetextureOriginalType.Surface,
      originalData: selectedSurface,
      originalBoundingBox: {
        center: [
          readSurfaceBoundsNumber(surfaceBounds, SurfaceBoundsMetaKey.CenterX),
          0,
          readSurfaceBoundsNumber(surfaceBounds, SurfaceBoundsMetaKey.CenterZ),
        ],
        size: [
          readSurfaceBoundsNumber(surfaceBounds, SurfaceBoundsMetaKey.Width),
          1,
          readSurfaceBoundsNumber(surfaceBounds, SurfaceBoundsMetaKey.Depth),
        ],
        min: [0, 0, 0],
      },
    }

    if (operationId) {
      updateOperation(operationId, {
        details: JSON.stringify(updatedMeta),
      })
    }

    previewRetexture(selectedSurface.id, modelUrl)

    setTimeout(() => {
      approveRetexture(selectedSurface.id)
      if (operationId) removeOperation(operationId)
      toast.success(SurfacePropertiesToast.MaterialApplied)
    }, 100)
  }

  const handleDiscard3D = () => {
    if (operationId) removeOperation(operationId)
    setPrompt(selectedSurface.type)
  }

  const handleCancel3D = () => {
    if (operationId) removeOperation(operationId)
    toast(SurfacePropertiesToast.GenerationCancelled)
  }

  const isGroundType = isGroundSurfaceType(selectedSurface.type)
  const isGenerating3D = Boolean(
    currentOperation && isActiveOperationStatus(currentOperation.status)
  )
  const is3DComplete = currentOperation?.status === AsyncOperationStatus.Completed
  const is3DFailed = currentOperation?.status === AsyncOperationStatus.Failed

  return (
    <div className="p-6 space-y-8">
      <SurfacePropertiesHeader
        selectedSurface={selectedSurface}
        isGroundType={isGroundType}
        onRemove={() => removeSurface(selectedSurface.id)}
      />

      {isGroundType && (
        <SurfaceTerrainSection
          selectedSurface={selectedSurface}
          terrainBrush={terrainBrush}
          groundColor={terrainSettings.groundColor}
          onPixelateChange={setTerrainBrushPixelate}
          onFidelityChange={setTerrainBrushFidelity}
          onGroundColorChange={setGroundColor}
          onUpdateSurface={updates => updateSurface(selectedSurface.id, updates)}
        />
      )}

      <SurfaceGeometrySection
        selectedSurface={selectedSurface}
        onUpdateSurface={updates => updateSurface(selectedSurface.id, updates)}
        onCreateFloor={() => createFloorFromSurface(selectedSurface.id)}
      />

      <SurfaceMaterialGenerationSection
        selectedSurface={selectedSurface}
        mode={mode}
        prompt={prompt}
        style={style}
        isGenerating={isGenerating}
        isStarting3D={isStarting3D}
        showPresets={showPresets}
        error={error}
        isGenerating3D={isGenerating3D}
        is3DComplete={is3DComplete}
        is3DFailed={is3DFailed}
        operationMeta={operationMeta}
        onPromptChange={setPrompt}
        onStyleChange={value => setStyle(value)}
        onTogglePresets={() => setShowPresets(current => !current)}
        onSelectPreset={value => {
          setPrompt(value)
          setShowPresets(false)
        }}
        onGenerate2D={handleGenerate2D}
        onGenerate3D={handleGenerate3D}
        onApply3D={handleApply3D}
        onDiscard3D={handleDiscard3D}
        onCancel3D={handleCancel3D}
      />

      <SurfacePreviewSections
        mode={mode}
        previewUrl={previewUrl}
        selectedSurface={selectedSurface}
        scale={scale}
        onApply2D={handleApply2D}
        onScaleChange={setScale}
        onUpdateSurface={updates => updateSurface(selectedSurface.id, updates)}
      />
    </div>
  )
}
