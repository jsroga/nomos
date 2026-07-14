'use client'

import React from 'react'
import { interiorDesignerApi } from '@/domains/interior-designer/io/interior-designer.api'
import { useInteriorStore } from '@/domains/interior-designer'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { SurfaceProperties } from './SurfaceProperties'
import { TerrainEditorPanel } from './TerrainEditorPanel'
import { Slider } from '@/components/Slider'
import { Switch } from '@/components/Switch'
import {
  Move,
  RotateCw,
  Maximize,
  Layers,
  Check,
  X,
  Sparkles,
  Loader2,
  Wand2,
  Box,
} from 'lucide-react'
import { seedFromString } from '@/shared/data/seedFromString'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import toast from 'react-hot-toast'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS, isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'
import {
  SidebarSection,
  SidebarLabel,
  SidebarInput,
  SidebarSliderRow,
  SidebarEmptyState,
} from '@/components/DomainSidebar'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
  isTerminalOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { INTERACTION_MODE_TERRAIN } from '@/domains/interior-designer/constants/interaction-modes'
import { InteriorDefaultProjectId } from '@/domains/interior-designer/constants/interior-api-defaults'
import {
  InteriorAsyncOperationType,
  InteriorElementPropertyKey,
  ModelFileExtension,
  PropertiesPanelError,
  PropertiesPanelLabel,
  PropertiesPanelLog,
  PropertiesPanelStatusLabel,
  PropertiesPanelToast,
  RetextureMetadataOriginalType,
  RETEXTURE_OPERATION_ID_PREFIX,
  TEXT_TO_3D_OPERATION_ID_PREFIX,
  UrlSchemePrefix,
} from '@/domains/interior-designer/constants/properties-panel'
import { RETEXTURE_EMPTY_METADATA } from '@/domains/interior-designer/constants/retexture-slice-log'

export const PropertiesPanel: React.FC = () => {
  const selectedId = useInteriorStore(state => state.selectedId)
  const mode = useInteriorStore(state => state.mode)
  const setSelected = useInteriorStore(state => state.setSelected)

  const walls = useInteriorStore(state => state.walls)
  const floors = useInteriorStore(state => state.floors)
  const surfaces = useInteriorStore(state => state.surfaces) // NEW
  const objects = useInteriorStore(state => state.objects)

  const updateWall = useInteriorStore(state => state.updateWall)
  const updateFloor = useInteriorStore(state => state.updateFloor)
  const updateObject = useInteriorStore(state => state.updateObject)

  const removeWall = useInteriorStore(state => state.removeWall)
  const removeFloor = useInteriorStore(state => state.removeFloor)
  const removeSurface = useInteriorStore(state => state.removeSurface) // NEW
  const removeObject = useInteriorStore(state => state.removeObject) // NEW

  const [combineRoundness, setCombineRoundness] = React.useState(0.2)
  const [batchHeight, setBatchHeight] = React.useState(3)

  const transformMode = useInteriorStore(state => state.transformMode)
  const setTransformMode = useInteriorStore(state => state.setTransformMode)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
  const combineWalls = useInteriorStore(state => state.combineWalls)

  // Group Actions
  const groups = useInteriorStore(state => state.groups)
  const createGroup = useInteriorStore(state => state.createGroup)

  // Derive selected surface from selectedId
  const selectedSurface = selectedId ? surfaces.find(s => s.id === selectedId) : null

  // Show Terrain Editor Panel when in TERRAIN mode
  if (mode === INTERACTION_MODE_TERRAIN) {
    return <TerrainEditorPanel />
  }

  // Check Surface Selection First
  if (selectedSurface) {
    return <SurfaceProperties />
  }

  const selectedItem =
    walls.find(w => w.id === selectedId) ||
    floors.find(f => f.id === selectedId) ||
    objects.find(o => o.id === selectedId)

  const isWall = (item: unknown): item is (typeof walls)[0] =>
    typeof item === 'object' &&
    item !== null &&
    InteriorElementPropertyKey.Thickness in item
  const isFloor = (item: unknown): item is (typeof floors)[0] =>
    typeof item === 'object' && item !== null && InteriorElementPropertyKey.Points in item
  const isObject = (item: unknown): item is (typeof objects)[0] =>
    typeof item === 'object' && item !== null && InteriorElementPropertyKey.ModelUrl in item

  // MULTI-SELECTION UI
  if (multiSelectedIds.length > 1) {
    const selectedWalls = walls.filter(w => multiSelectedIds.includes(w.id))
    const allAreWalls = selectedWalls.length === multiSelectedIds.length

    return (
      <div className="space-y-6">
        <SidebarSection
          title="Multi-Selection"
          rightContent={
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-2">
              {multiSelectedIds.length} items
            </span>
          }
        >
          {allAreWalls && (
            <div className="space-y-6 pt-2">
              {/* Batch Height */}
              <div className="space-y-3">
                <SidebarSliderRow
                  label="Batch Height"
                  value={batchHeight}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={h => {
                    setBatchHeight(h)
                    multiSelectedIds.forEach(id => updateWall(id, { height: h }))
                  }}
                  formatValue={val => `${val.toFixed(1)}m`}
                />
                <Slider
                  value={[batchHeight]}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onValueChange={vals => {
                    const h = vals[0]
                    setBatchHeight(h)
                    multiSelectedIds.forEach(id => updateWall(id, { height: h }))
                  }}
                />
              </div>

              {/* Combine Actions */}
              <div className="pt-6 border-t border-border space-y-6">
                <div className="space-y-2">
                  <SidebarSliderRow
                    label="Combine Roundness"
                    value={combineRoundness}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setCombineRoundness}
                    formatValue={val => val.toFixed(2)}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>Sharp</span>
                    <span>Round</span>
                  </div>
                </div>

                <Button
                  onClick={() => combineWalls({ roundness: combineRoundness })}
                  variant="default"
                  className="w-full font-mono text-[10px] uppercase tracking-widest py-3 flex items-center justify-center gap-2"
                >
                  <Layers size={14} />
                  Combine Walls
                </Button>

                <div className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border leading-relaxed text-center">
                  Merges selected walls into a single curved surface with the specified roundness.
                </div>
              </div>
            </div>
          )}

          {!allAreWalls && (
            <div className="space-y-4 pt-2">
              <div className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border text-center">
                {multiSelectedIds.length} items selected
              </div>

              {/* Group Creation for Objects */}
              {multiSelectedIds.some(id => objects.find(o => o.id === id)) && (
                <Button
                  onClick={() => {
                    const name = `Group ${groups.length + 1}`
                    createGroup(name, multiSelectedIds)
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  <Layers size={14} />
                  Create Group
                </Button>
              )}
            </div>
          )}
        </SidebarSection>
      </div>
    )
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (walls.find(w => w.id === selectedId)) removeWall(selectedId)
    else if (floors.find(f => f.id === selectedId)) removeFloor(selectedId)
    else if (objects.find(o => o.id === selectedId)) removeObject(selectedId)
    else if (surfaces.find(s => s.id === selectedId)) removeSurface(selectedId) // Fallback
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <SidebarSection
        title="Element Properties"
        className="px-1"
        icon={<Sparkles size={14} className="text-indigo-400" />}
      >
        <div className="space-y-6 pt-4">
          {/* Show snap controls in OBJECT mode when nothing selected */}
          {mode === 'OBJECT' && !selectedId && (
            <div className="space-y-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                <div className="h-px bg-white/10 flex-1" />
                Object Placement
                <div className="h-px bg-white/10 flex-1" />
              </div>
              <SnapControls />
            </div>
          )}

          {!selectedId && mode !== 'OBJECT' && (
            <SidebarEmptyState
              message={mode === 'SELECT' ? 'Select an object to edit properties' : `Mode: ${mode}`}
            />
          )}

          {selectedItem && (
            <div className="space-y-6">
              <div className="text-[10px] font-mono font-bold bg-muted/30 p-3 rounded-lg text-muted-foreground border border-border flex items-center justify-between">
                <span className="uppercase tracking-widest text-[9px]">Reference ID</span>
                <span className="font-mono text-foreground bg-background/50 px-2 py-0.5 rounded">{selectedItem.id.slice(0, 8)}</span>
              </div>

              {/* Color/Texture Input */}
              <div className="space-y-2">
                <SidebarInput
                  type="text"
                  value={
                    isObject(selectedItem) ? selectedItem.modelUrl : selectedItem.texture || ''
                  }
                  placeholder="#ffffff or url"
                  onChange={e => {
                    const val = e.target.value
                    if (isWall(selectedItem)) updateWall(selectedId!, { texture: val })
                    else if (isFloor(selectedItem)) updateFloor(selectedId!, { texture: val })
                    else if (isObject(selectedItem)) updateObject(selectedId!, { modelUrl: val })
                  }}
                />
              </div>

              {/* Height Input (Walls only) */}
              {isWall(selectedItem) && (
                <div className="space-y-2">
                  <SidebarSliderRow
                    label="Height"
                    value={selectedItem.height}
                    min={0.5}
                    max={10}
                    step={0.1}
                    onChange={val => updateWall(selectedId!, { height: val })}
                    formatValue={val => `${val.toFixed(1)}m`}
                  />
                </div>
              )}

              {/* Object Transform Controls */}
              {isObject(selectedItem) && (
                <SidebarSection title="Transform" separator={false}>
                  <SnapControls />

                  {/* Mode Switcher */}
                  <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
                    <Button
                      variant={transformMode === 'translate' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTransformMode('translate')}
                      title="Move (G)"
                      className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8"
                    >
                      <Move size={12} className="mr-1.5" />
                      Move
                    </Button>
                    <Button
                      variant={transformMode === 'rotate' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTransformMode('rotate')}
                      title="Rotate (R)"
                      className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8"
                    >
                      <RotateCw size={12} className="mr-1.5" />
                      Rotate
                    </Button>
                    <Button
                      variant={transformMode === 'scale' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTransformMode('scale')}
                      title="Scale (S)"
                      className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8"
                    >
                      <Maximize size={12} className="mr-1.5" />
                      Scale
                    </Button>
                  </div>

                  {/* Height Slider - Shows when scale mode is active */}
                  {transformMode === 'scale' && (
                    <HeightScaleControl
                      objectId={selectedItem.id}
                      currentScale={selectedItem.scale}
                      onScaleChange={newScale => updateObject(selectedItem.id, { scale: newScale })}
                    />
                  )}
                </SidebarSection>
              )}

              {/* COLOR PICKER for Window/Door */}
              {isObject(selectedItem) &&
                (selectedItem.modelUrl === 'window' || selectedItem.modelUrl === 'door') && (
                  <div className="pt-6 border-t border-white/5 space-y-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Object Color
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedItem.color || '#7a6f5e'}
                        onChange={e => updateObject(selectedItem.id, { color: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-zinc-400">
                        {selectedItem.color || '#7a6f5e'}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['#7a6f5e', '#a39484', '#5c534a', '#8b7355', '#6b5b4f', '#3d3630'].map(
                        preset => (
                          <button
                            key={preset}
                            onClick={() => updateObject(selectedItem.id, { color: preset })}
                            className="w-8 h-8 rounded-lg border border-white/10 hover:scale-110 transition-transform"
                            style={{ backgroundColor: preset }}
                            title={preset}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* RETEXTURE UI */}
              {(isObject(selectedItem) || isWall(selectedItem)) && (
                <RetextureControls
                  objectId={selectedItem.id}
                  modelUrl={
                    isObject(selectedItem) ? selectedItem.modelUrl : selectedItem.texture || ''
                  }
                />
              )}

              {/* TEXT TO 3D UI */}
              {isObject(selectedItem) && (
                <TextTo3DControls
                  objectId={selectedItem.id}
                  onModelGenerated={modelUrl =>
                    updateObject(selectedItem.id, { modelUrl, isLoading: false })
                  }
                />
              )}

              <Button
                onClick={handleDelete}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 py-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all mt-4 border border-transparent hover:border-red-500/20"
              >
                Delete Object
              </Button>
            </div>
          )}
        </div>
      </SidebarSection>
    </div>
  )
}
// Snap Controls Component (used in both OBJECT mode and when object selected)
function SnapControls() {
  const lockY = useInteriorStore(state => state.lockY)
  const setLockY = useInteriorStore(state => state.setLockY)
  const snapEnabled = useInteriorStore(state => state.snapEnabled)
  const setSnapEnabled = useInteriorStore(state => state.setSnapEnabled)
  const snapSize = useInteriorStore(state => state.snapSize)
  const setSnapSize = useInteriorStore(state => state.setSnapSize)

  return (
    <div className="space-y-4">
      {/* Lock Y */}
      <div className="flex items-center justify-between">
        <SidebarLabel>Lock Height (Y-Axis)</SidebarLabel>
        <Switch checked={lockY} onCheckedChange={setLockY} />
      </div>

      {/* Snapping */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SidebarLabel>Grid Snapping</SidebarLabel>
          <Switch checked={snapEnabled} onCheckedChange={setSnapEnabled} />
        </div>

        {snapEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Grid Size</span>
              <span>{snapSize}m</span>
            </div>
            <Slider
              value={[snapSize]}
              min={0.1}
              max={5}
              step={0.1}
              onValueChange={vals => setSnapSize(vals[0])}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Height Scale Control Component - for uniform scaling based on height in meters
function HeightScaleControl({
  objectId: _objectId,
  currentScale,
  onScaleChange,
}: {
  objectId: string
  currentScale: [number, number, number]
  onScaleChange: (scale: [number, number, number]) => void
}) {
  // Default base height is 1 meter (when scale is 1)
  const BASE_HEIGHT = 1.0

  // Calculate current height from Y scale
  const currentHeight = currentScale[1] * BASE_HEIGHT

  // Local state for the slider to avoid flickering
  const [heightValue, setHeightValue] = React.useState(currentHeight)

  // Sync with external changes
  React.useEffect(() => {
    setHeightValue(currentScale[1] * BASE_HEIGHT)
  }, [currentScale[1]])

  const handleHeightChange = (newHeight: number) => {
    setHeightValue(newHeight)

    // Calculate uniform scale factor based on height
    const scaleFactor = newHeight / BASE_HEIGHT

    // Apply proportional scaling to all axes
    onScaleChange([scaleFactor, scaleFactor, scaleFactor])
  }

  return (
    <div className="space-y-3 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50 mt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono font-medium flex items-center gap-1.5">
          <Maximize size={12} />
          Object Height
        </label>
        <span className="text-xs text-muted-foreground font-mono">{heightValue.toFixed(2)}m</span>
      </div>
      <Slider
        value={[heightValue]}
        min={0.1}
        max={10}
        step={0.1}
        onValueChange={vals => handleHeightChange(vals[0])}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0.1m</span>
        <span>Proportional scaling</span>
        <span>10m</span>
      </div>
    </div>
  )
}

// Elevation Control Component - for precise Y axis placement
// Retexture Controls Component
function RetextureControls({ objectId, modelUrl }: { objectId: string; modelUrl: string }) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)

  // Use GlobalStatusStore for job tracking
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

  // Find this element's operation
  const operationId = `${RETEXTURE_OPERATION_ID_PREFIX}${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  // Auto-cleanup: Check stale operations on mount
  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (isTerminalOperationStatus(currentOperation.status)) return

      // Extract task ID and original URL
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
        taskId = metadata.taskId
      } catch (e) {
        console.error(PropertiesPanelLog.RetextureMetadataParseFailed, e)
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

            // Auto-Apply Preview
            if (!retexturedUrl) {
              return
            }

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

  // Polling Logic
  React.useEffect(() => {
    if (!currentOperation) return

    const isTerminalState = isTerminalOperationStatus(currentOperation.status)
    if (isTerminalState) return

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
        } catch (e) {
          return
        }

        if (!taskId) return

        const data = await interiorDesignerApi.retexture.getStatus(taskId)

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          const retexturedUrl = output?.retexturedUrl || output?.url || output?.modelUrl

          if (retexturedUrl) {
            // IMMEDIATE PREVIEW
            previewRetexture(objectId, retexturedUrl)

            updateOperation(operationId, {
              status: AsyncOperationStatus.Completed,
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA),
                retexturedUrl: retexturedUrl,
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

        // Get actual project ID for style reference lookup
        const currentProject = useWorldStore.getState().currentProject
        const currentProjectId = currentProject?.id || InteriorDefaultProjectId.Default
        console.log(
          `[RetextureControls] Sending retexture request with projectId: ${currentProjectId}`,
          { currentProject: currentProject?.name }
        )

        const data = await interiorDesignerApi.retexture.start({
          modelUrlOrBase64: urlOrBase64,
          prompt,
          assetId: objectId,
          projectId: currentProjectId,
          apiKey,
        })

        if (data.runId) {
          // Prepare metadata with original state for undo
          const metadata: Record<string, unknown> = {
            taskId: data.runId,
            originalModelUrl: modelUrl,
          }

          // If it's a wall, save its data so we can revert
          const wallData = useInteriorStore.getState().walls.find(w => w.id === objectId)
          if (wallData) {
            metadata.originalType = RetextureMetadataOriginalType.Wall
            metadata.originalData = wallData
          } else {
            // Check if it's a surface
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
    [prompt, objectId, operationId, updateOperation, removeOperation, modelUrl]
  )

  // Effect for export
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

    // Add operation to GlobalStatusStore with ORIGINAL URL
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

  const handleApply = () => {
    approveRetexture(objectId)
  }

  const handleDiscard = () => {
    cancelRetexture(objectId)
  }

  const handleScaleChange = (val: number[]) => {
    const scale = val[0]
    if (object) {
      // Calculate new relative scale if needed, or just set absolute scale multiplier?
      // Simplest: Assume uniform scaling for correction
      updateObject(objectId, { scale: [scale, scale, scale] })
    }
  }

  // COMPLETED STATE - Show Approve/Reject + Scale Fix
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

        {/* Scale Fixer */}
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
          <Button onClick={handleApply} size="sm" className="flex-1 h-8 text-xs font-mono">
            <Check size={12} className="mr-1.5" /> Apply
          </Button>
          <Button
            onClick={handleDiscard}
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

  // IN PROGRESS STATE - Show Loading
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

  // FAILED STATE - Show Error
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

  // IDLE STATE - Show Input Form
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

// Text to 3D Controls Component - Generate 3D object from text prompt using Meshy API
function TextTo3DControls({
  objectId,
  onModelGenerated,
}: {
  objectId: string
  onModelGenerated: (modelUrl: string) => void
}) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)

  // Use GlobalStatusStore for job tracking
  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  // Find this element's operation
  const operationId = `${TEXT_TO_3D_OPERATION_ID_PREFIX}${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  // Auto-cleanup: Check stale operations on mount
  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (isTerminalOperationStatus(currentOperation.status)) return

      // Extract task ID
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
        taskId = metadata.taskId
      } catch (e) {
        console.error(PropertiesPanelLog.TextTo3DMetadataParseFailed, e)
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
          console.warn(
            `${PropertiesPanelLog.TextTo3DTaskFailed} ${data.status}`
          )
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
  }, []) // Run once on mount

  // Polling Logic - Resume for in-progress jobs
  React.useEffect(() => {
    if (!currentOperation) return

    // Stop polling if operation is in a terminal state
    const isTerminalState = isTerminalOperationStatus(currentOperation.status)
    if (isTerminalState) {
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
        // Re-check current state before making API call
        const latestOp = useGlobalStatusStore
          .getState()
          .operations.find(op => op.id === operationId)
        if (!latestOp || isTerminalOperationStatus(latestOp.status)) {
          console.log(PropertiesPanelLog.TextTo3DPollSkipped)
          return
        }

        // Extract task ID from operation details
        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
          taskId = metadata.taskId
        } catch (e) {
          console.error(PropertiesPanelLog.OperationMetadataParseFailed, e)
          return
        }

        if (!taskId) return

        const data = await interiorDesignerApi.textTo3D.getStatus(taskId)

        console.log(`[TextTo3D] Poll result for ${operationId}:`, data.status)

        if (isSuccessTaskStatus(data.status)) {
          const output = data.output
          if (output && output.success) {
            // Store result in operation metadata
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
          // Task is no longer active (FAILED, CANCELED, etc.)
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

    // Poll every 15 seconds (text-to-3d takes longer than retexture)
    pollInterval = setInterval(checkStatus, POLLING_INTERVALS.SLOW)
    return () => {
      console.log(`[TextTo3D] Clearing interval for ${operationId}`)
      clearInterval(pollInterval)
    }
  }, [currentOperation, operationId, updateOperation])

  const handleGenerate = async () => {
    if (!prompt) return

    // DUPLICATE PREVENTION: Check if job already exists
    if (currentOperation && isActiveOperationStatus(currentOperation.status)) {
      toast.error(PropertiesPanelToast.TextTo3DJobInProgress)
      return
    }

    setIsStarting(true)

    // Add operation to GlobalStatusStore
    addOperation({
      id: operationId,
      type: InteriorAsyncOperationType.TextTo3D,
      label: `Generating 3D: ${prompt.slice(0, 30)}...`,
      details: JSON.stringify({ prompt }),
      status: AsyncOperationStatus.Pending,
    })

    try {
      // Get Meshy API Key from local storage
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

      // Get master prompt for seed generation
      let masterPrompt = ''
      // Use useWorldStore to get the correct valid project ID
      const currentProject = useWorldStore.getState().currentProject
      const currentProjectId = currentProject?.id

      if (currentProjectId) {
        masterPrompt =
          localStorage.getItem(`${LocalStorageKeys.MASTER_PROMPT}-${currentProjectId}`) || ''
      }

      // Generate seed from master prompt + object prompt
      const seed = seedFromString(`${masterPrompt}|${prompt}`)

      const data = await interiorDesignerApi.textTo3D.start({
        projectId: currentProjectId || InteriorDefaultProjectId.Default,
        prompt,
        seed,
        apiKey,
      })
      if (data.runId) {
        // Update operation with task ID
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

  // COMPLETED STATE - Show Apply/Discard
  if (currentOperation && currentOperation.status === AsyncOperationStatus.Completed) {
    let thumbnailUrl = ''
    try {
      const metadata = JSON.parse(currentOperation.details || RETEXTURE_EMPTY_METADATA)
      thumbnailUrl = metadata.thumbnailUrl || ''
    } catch { }

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

  // IN PROGRESS STATE - Show Loading
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

  // FAILED STATE - Show Error
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

  // IDLE STATE - Show Input Form
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
