'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { SurfaceProperties } from './SurfaceProperties'
import { TerrainEditorPanel } from './TerrainEditorPanel'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Move, RotateCw, Maximize, Layers, Check, X, Sparkles, Loader2, Wand2, Box } from 'lucide-react'
import { seedFromString } from '@/lib/seedFromString'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'
import { SidebarSection, SidebarLabel } from '@/components/ui/domain-sidebar'


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

  const updateSurface = useInteriorStore(state => state.updateSurface)
  const createFloorFromSurface = useInteriorStore(state => state.createFloorFromSurface)

  const [combineRoundness, setCombineRoundness] = React.useState(0.2)
  const [batchHeight, setBatchHeight] = React.useState(3)

  // Object Controls
  const lockY = useInteriorStore(state => state.lockY)
  const setLockY = useInteriorStore(state => state.setLockY)
  const snapEnabled = useInteriorStore(state => state.snapEnabled)
  const setSnapEnabled = useInteriorStore(state => state.setSnapEnabled)
  const snapSize = useInteriorStore(state => state.snapSize)
  const setSnapSize = useInteriorStore(state => state.setSnapSize)

  const transformMode = useInteriorStore(state => state.transformMode)
  const setTransformMode = useInteriorStore(state => state.setTransformMode)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
  const combineWalls = useInteriorStore(state => state.combineWalls)

  // Show Terrain Editor Panel when in TERRAIN mode
  if (mode === 'TERRAIN') {
    return <TerrainEditorPanel />
  }

  // Check Surface Selection First
  const selectedSurface = surfaces.find(s => s.id === selectedId)
  if (selectedSurface) {
    return (
      <div className="p-4">
        <SidebarSection title="Properties">
          <div className="text-[10px] font-medium bg-zinc-900/50 p-2.5 rounded-md mb-6 text-zinc-500 border border-zinc-800/50 flex items-center gap-2">
            <span className="uppercase tracking-wider opacity-50">ID</span>
            <span className="font-mono text-zinc-400">{selectedSurface.id.slice(0, 8)}</span>
          </div>

          {/* Surface Properties handles all controls for surfaces including walls */}
          <SurfaceProperties />

          {/* AI RETEXTURE for Surfaces (including combined walls) */}
          <RetextureControls
            objectId={selectedSurface.id}
            modelUrl={selectedSurface.texture || ''}
          />
        </SidebarSection>
      </div>
    )
  }




  const selectedItem =
    walls.find(w => w.id === selectedId) ||
    floors.find(f => f.id === selectedId) ||
    objects.find(o => o.id === selectedId)

  const isWall = (item: any): item is (typeof walls)[0] => 'thickness' in item
  const isFloor = (item: any): item is (typeof floors)[0] => 'points' in item
  const isObject = (item: any): item is (typeof objects)[0] => 'modelUrl' in item

  // MULTI-SELECTION UI
  if (multiSelectedIds.length > 1) {
    const selectedWalls = walls.filter(w => multiSelectedIds.includes(w.id))
    const allAreWalls = selectedWalls.length === multiSelectedIds.length

    return (
      <div className="p-4 space-y-6">
        <SidebarSection
          title="Multi-Selection"
          rightContent={<span className="text-xs font-mono text-muted-foreground ml-2">{multiSelectedIds.length} items</span>}
        >

          {allAreWalls && (
            <>
              {/* Batch Height */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <SidebarLabel>Batch Height</SidebarLabel>
                  <span className="text-muted-foreground">{batchHeight}m</span>
                </div>
                <Slider
                  value={[batchHeight]}
                  min={0.5} max={10} step={0.5}
                  onValueChange={(vals) => {
                    const h = vals[0]
                    setBatchHeight(h)
                    multiSelectedIds.forEach(id => updateWall(id, { height: h }))
                  }}
                />
              </div>

              {/* Combine Actions */}
              <div className="pt-4 border-t border-zinc-800 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <SidebarLabel>Combine Roundness</SidebarLabel>
                    <span className="text-muted-foreground">{combineRoundness}</span>
                  </div>
                  <Slider
                    value={[combineRoundness]}
                    min={0} max={1} step={0.05}
                    onValueChange={(vals) => setCombineRoundness(vals[0])}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Sharp</span>
                    <span>Round</span>
                  </div>
                </div>

                <button
                  onClick={() => combineWalls({ roundness: combineRoundness })}
                  className="w-full bg-primary text-primary-foreground py-2 rounded text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Layers size={16} />
                  Combine Walls
                </button>

                <div className="text-xs text-zinc-500 bg-zinc-950/50 p-2 rounded">
                  Merges selected walls into a single curved surface with the specified roundness.
                </div>
              </div>
            </>
          )}

          {!allAreWalls && (
            <div className="text-xs text-zinc-500 bg-zinc-950/50 p-2 rounded">
              Multiple types selected. Actions limited.
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
    <div className="p-4">
      <SidebarSection title="Properties">
        {/* Show snap controls in OBJECT mode when nothing selected */}
        {mode === 'OBJECT' && !selectedId && (
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wide text-muted-foreground mb-2">Object Placement</div>
            <SnapControls />
          </div>
        )}

        {!selectedId && mode !== 'OBJECT' && (
          <div className="text-sm text-muted-foreground">
            {mode === 'SELECT' ? 'Select an object to edit properties' : `Mode: ${mode}`}
          </div>
        )}

        {selectedItem && (
          <>
            <div className="text-[10px] font-medium bg-zinc-900/50 p-2.5 rounded-md mb-6 text-zinc-500 border border-zinc-800/50 flex items-center gap-2">
              <span className="uppercase tracking-wider opacity-50">ID</span>
              <span className="font-mono text-zinc-400">{selectedItem.id.slice(0, 8)}</span>
            </div>

            {/* Color/Texture Input */}
            <div>
              <SidebarLabel className="mb-1">Color / Texture</SidebarLabel>
              <input
                type="text"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md py-2 px-3 text-xs text-zinc-300 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                value={isObject(selectedItem) ? selectedItem.modelUrl : selectedItem.texture || ''}
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
              <div>
                <SidebarLabel className="mb-1">Height</SidebarLabel>
                <input
                  type="number"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md py-2 px-3 text-xs text-zinc-300 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={selectedItem.height}
                  onChange={e => updateWall(selectedId!, { height: Number(e.target.value) })}
                />
              </div>
            )}


            {/* Object Transform Controls */}
            {isObject(selectedItem) && (
              <div className="space-y-5 pt-4 border-t border-zinc-800/50 mt-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Transform Settings</h3>

                <SnapControls />

                {/* Mode Switcher */}
                <div className="flex bg-zinc-900 p-1 rounded-md mb-4 border border-zinc-800">
                  <button
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-all ${transformMode === 'translate'
                      ? 'bg-background shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-background/50'
                      }`}
                    onClick={() => setTransformMode('translate')}
                    title="Move (G)"
                  >
                    <Move size={12} className="mr-1.5" />
                    Move
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-all ${transformMode === 'rotate'
                      ? 'bg-background shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-background/50'
                      }`}
                    onClick={() => setTransformMode('rotate')}
                    title="Rotate (R)"
                  >
                    <RotateCw size={12} className="mr-1.5" />
                    Rotate
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-all ${transformMode === 'scale'
                      ? 'bg-background shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-background/50'
                      }`}
                    onClick={() => setTransformMode('scale')}
                    title="Scale (S)"
                  >
                    <Maximize size={12} className="mr-1.5" />
                    Scale
                  </button>
                </div>

                {/* Height Slider - Shows when scale mode is active */}
                {transformMode === 'scale' && (
                  <HeightScaleControl
                    objectId={selectedItem.id}
                    currentScale={selectedItem.scale}
                    onScaleChange={(newScale) => updateObject(selectedItem.id, { scale: newScale })}
                  />
                )}
              </div>
            )}

            {/* RETEXTURE UI (Placement Update: Above Delete) */}
            {/* Enable for Objects AND Walls (though Walls might fail if no modelUrl, we'll handle gracefully) */}
            {(isObject(selectedItem) || isWall(selectedItem)) && (
              <RetextureControls
                objectId={selectedItem.id}
                modelUrl={isObject(selectedItem) ? selectedItem.modelUrl : (selectedItem.texture || '')}
              />
            )}

            {/* TEXT TO 3D UI - Generate new 3D object from text prompt */}
            {isObject(selectedItem) && (
              <TextTo3DControls
                objectId={selectedItem.id}
                onModelGenerated={(modelUrl) => updateObject(selectedItem.id, { modelUrl, isLoading: false })}
              />
            )}

            <button
              onClick={handleDelete}
              className="w-full bg-destructive text-destructive-foreground py-2 rounded text-sm hover:bg-destructive/90"
            >
              Delete
            </button>
          </>
        )}
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
  objectId,
  currentScale,
  onScaleChange
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
        <span className="text-xs text-muted-foreground font-mono">
          {heightValue.toFixed(2)}m
        </span>
      </div>
      <Slider
        value={[heightValue]}
        min={0.1}
        max={10}
        step={0.1}
        onValueChange={(vals) => handleHeightChange(vals[0])}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0.1m</span>
        <span>Proportional scaling</span>
        <span>10m</span>
      </div>
    </div>
  )
}

// Retexture Controls Component
function RetextureControls({ objectId, modelUrl }: { objectId: string, modelUrl: string }) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)
  const [previewScale, setPreviewScale] = React.useState(1)

  // Use GlobalStatusStore for job tracking
  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  // const cancelRetexture = useInteriorStore(state => state.cancelRetexture) // Handled locally now for revert

  const previewRetexture = useInteriorStore(state => state.previewRetexture)
  const cancelRetexture = useInteriorStore(state => state.cancelRetexture)

  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const retextureModelBase64 = useInteriorStore(state => state.retextureModelBase64)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)

  const updateObject = useInteriorStore(state => state.updateObject)
  const object = useInteriorStore(state => state.objects.find(o => o.id === objectId))
  const wall = useInteriorStore(state => state.walls.find(w => w.id === objectId))

  // Find this element's operation
  const operationId = `retexture-${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  // Auto-cleanup: Check stale operations on mount
  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (currentOperation.status === 'completed' || currentOperation.status === 'failed') return

      // Extract task ID and original URL
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || '{}')
        taskId = metadata.taskId
      } catch (e) {
        console.error('[Retexture] Failed to parse operation metadata for cleanup', e)
        return
      }

      if (!taskId) return

      console.log(`[Retexture] Checking stale operation ${operationId} with taskId ${taskId}`)

      try {
        const res = await fetch(`/api/interior-designer/retexture/${taskId}`)
        if (!res.ok) {
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ ...JSON.parse(currentOperation.details || '{}'), error: 'Task not found' })
          })
          return
        }

        const data = await res.json()

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            const retexturedUrl = output.retexturedUrl

            // Auto-Apply Preview
            previewRetexture(objectId, retexturedUrl)

            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || '{}'),
                retexturedUrl: output.retexturedUrl
              })
            })
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ ...JSON.parse(currentOperation.details || '{}'), error: data.error })
          })
        }
      } catch (err) {
        console.error('[Retexture] Cleanup check error', err)
      }
    }

    cleanupStaleOperation()
  }, [])

  // Polling Logic
  React.useEffect(() => {
    if (!currentOperation) return

    const isTerminalState = currentOperation.status === 'completed' || currentOperation.status === 'failed'
    if (isTerminalState) return

    const checkStatus = async () => {
      try {
        const latestOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
        if (!latestOp || latestOp.status === 'completed' || latestOp.status === 'failed') return

        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || '{}')
          taskId = metadata.taskId
        } catch (e) { return }

        if (!taskId) return

        const res = await fetch(`/api/interior-designer/retexture/${taskId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          const retexturedUrl = output?.retexturedUrl || output?.url || output?.modelUrl

          if (retexturedUrl) {
            // IMMEDIATE PREVIEW
            previewRetexture(objectId, retexturedUrl)

            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                ...JSON.parse(currentOperation.details || '{}'),
                retexturedUrl: retexturedUrl
              })
            })
          } else {
            updateOperation(operationId, {
              status: 'failed',
              details: JSON.stringify({ ...JSON.parse(currentOperation.details || '{}'), error: 'Output missing URL' })
            })
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ ...JSON.parse(currentOperation.details || '{}'), error: data.error })
          })
        }
      } catch (err) {
        console.error('Poll error', err)
      }
    }

    const pollInterval = setInterval(checkStatus, POLLING_INTERVALS.DEFAULT)
    return () => clearInterval(pollInterval)
  }, [currentOperation, operationId, updateOperation, previewRetexture, objectId])

  const triggerRetexture = React.useCallback(async (urlOrBase64: string) => {
    try {
      let apiKey = ''
      try {
        const savedMeshy = localStorage.getItem(LocalStorageKeys.AI_CONFIG_MESHY)
        if (savedMeshy) apiKey = JSON.parse(savedMeshy).apiKey || ''
      } catch (err) { }

      // Get actual project ID for style reference lookup
      const currentProject = useWorldStore.getState().currentProject
      const currentProjectId = currentProject?.id || 'default'
      console.log(`[RetextureControls] Sending retexture request with projectId: ${currentProjectId}`, { currentProject: currentProject?.name })

      const res = await fetch('/api/interior-designer/retexture', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUrlOrBase64: urlOrBase64,
          prompt,
          assetId: objectId,
          projectId: currentProjectId,
          apiKey // Send the key to the backend
        })
      })
      const data = await res.json()
      if (data.runId) {

        // Prepare metadata with original state for undo
        const metadata: any = {
          taskId: data.runId,
          originalModelUrl: modelUrl
        }

        // If it's a wall, save its data so we can revert
        const wallData = useInteriorStore.getState().walls.find(w => w.id === objectId)
        if (wallData) {
          metadata.originalType = 'wall'
          metadata.originalData = wallData
        } else {
          // Check if it's a surface
          const surfaceData = useInteriorStore.getState().surfaces.find(s => s.id === objectId)
          if (surfaceData) {
            metadata.originalType = 'surface'
            metadata.originalData = surfaceData
          } else {
            metadata.originalType = 'object'
          }
        }

        updateOperation(operationId, {
          status: 'in-progress',
          details: JSON.stringify(metadata)
        })
      } else {
        throw new Error(data.error)
      }
    } catch (e: any) {
      toast.error('Failed to start retexture')
      removeOperation(operationId)
      setIsStarting(false)
    }
  }, [prompt, objectId, operationId, updateOperation, removeOperation, modelUrl])

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

    if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
      toast.error('Job already in progress')
      return
    }

    setIsStarting(true)

    // Add operation to GlobalStatusStore with ORIGINAL URL
    addOperation({
      id: operationId,
      type: 'retexture',
      label: `Retexturing Element`,
      details: JSON.stringify({ prompt, originalModelUrl: modelUrl }),
      status: 'pending'
    })

    setRetextureModelBase64(null)

    const is3DModelUrl = modelUrl && (modelUrl.endsWith('.glb') || modelUrl.endsWith('.gltf') || modelUrl.startsWith('http'))

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
  if (currentOperation && currentOperation.status === 'completed') {
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
            onValueChange={(val) => handleScaleChange(val)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} size="sm" className="flex-1 h-8 text-xs font-mono">
            <Check size={12} className="mr-1.5" /> Apply
          </Button>
          <Button onClick={handleDiscard} size="sm" variant="ghost" className="flex-1 h-8 text-xs font-mono text-destructive hover:text-destructive hover:bg-destructive/10">
            <X size={12} className="mr-1.5" /> Discard
          </Button>
        </div>
      </div>
    )
  }

  // IN PROGRESS STATE - Show Loading
  if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/20 rounded gap-2">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs font-mono text-muted-foreground">
            {currentOperation.status === 'pending' ? 'Starting Job...' : 'Generating Texture...'}
          </span>
        </div>
      </div>
    )
  }

  // FAILED STATE - Show Error
  if (currentOperation && currentOperation.status === 'failed') {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs">
          <p className="font-semibold text-destructive mb-1">Retexture Failed</p>
          <p className="text-muted-foreground mb-2">An error occurred while generating the texture.</p>
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
          {isStarting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
          Generate New Texture
        </Button>
      </div>
    </SidebarSection>
  )
}

// Text to 3D Controls Component - Generate 3D object from text prompt using Meshy API
function TextTo3DControls({
  objectId,
  onModelGenerated
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
  const operationId = `text-to-3d-${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  // Auto-cleanup: Check stale operations on mount
  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (currentOperation.status === 'completed' || currentOperation.status === 'failed') return

      // Extract task ID
      let taskId: string | null = null
      try {
        const metadata = JSON.parse(currentOperation.details || '{ }')
        taskId = metadata.taskId
      } catch (e) {
        console.error('[TextTo3D] Failed to parse operation metadata for cleanup', e)
        return
      }

      if (!taskId) return

      console.log(`[TextTo3D] Checking stale operation ${operationId} with taskId ${taskId}`)

      try {
        const res = await fetch(`/api/interior-designer/text-to-3d/${taskId}`)
        if (!res.ok) {
          console.warn(`[TextTo3D] Failed to fetch status for ${taskId}, marking as failed`)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: 'Task not found or API error', failureStatus: 'NOT_FOUND' })
          })
          return
        }

        const data = await res.json()
        console.log(`[TextTo3D] Stale check result for ${operationId}:`, data.status)

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                taskId,
                modelUrl: output.modelUrl,
                assetId: output.assetId,
                thumbnailUrl: output.thumbnailUrl
              })
            })
            console.log(`[TextTo3D] Stale operation ${operationId} was actually completed`)
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          console.warn(`[TextTo3D] Stale operation ${operationId} has failed status: ${data.status}`)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status })
          })
        }
      } catch (err) {
        console.error('[TextTo3D] Cleanup check error', err)
      }
    }

    cleanupStaleOperation()
  }, []) // Run once on mount

  // Polling Logic - Resume for in-progress jobs
  React.useEffect(() => {
    if (!currentOperation) return

    // Stop polling if operation is in a terminal state
    const isTerminalState = currentOperation.status === 'completed' || currentOperation.status === 'failed'
    if (isTerminalState) {
      console.log(`[TextTo3D] Polling stopped for ${operationId} - terminal state: ${currentOperation.status}`)
      return
    }

    console.log(`[TextTo3D] Starting polling for ${operationId} - status: ${currentOperation.status}`)

    let pollInterval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        // Re-check current state before making API call
        const latestOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
        if (!latestOp || latestOp.status === 'completed' || latestOp.status === 'failed') {
          console.log(`[TextTo3D] Skipping poll - operation is in terminal state or missing`)
          return
        }

        // Extract task ID from operation details
        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || '{ }')
          taskId = metadata.taskId
        } catch (e) {
          console.error('Failed to parse operation metadata', e)
          return
        }

        if (!taskId) return

        const res = await fetch(`/api/interior-designer/text-to-3d/${taskId}`)
        if (!res.ok) return
        const data = await res.json()

        console.log(`[TextTo3D] Poll result for ${operationId}:`, data.status)

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            // Store result in operation metadata
            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                taskId,
                modelUrl: output.modelUrl,
                assetId: output.assetId,
                thumbnailUrl: output.thumbnailUrl
              })
            })
            console.log(`[TextTo3D] Marked ${operationId} as completed`)
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          // Task is no longer active (FAILED, CANCELED, etc.)
          console.error('Text-to-3D task failed or was terminated:', data.status, data.error)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status })
          })
        }
      } catch (err) {
        console.error('Poll error', err)
      }
    }

    // Poll every 15 seconds (text-to-3d takes longer than retexture)
    pollInterval = setInterval(checkStatus, 15000)
    return () => {
      console.log(`[TextTo3D] Clearing interval for ${operationId}`)
      clearInterval(pollInterval)
    }
  }, [currentOperation, operationId, updateOperation])

  const handleGenerate = async () => {
    if (!prompt) return

    // DUPLICATE PREVENTION: Check if job already exists
    if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
      toast.error('Text-to-3D job already in progress for this element')
      return
    }

    setIsStarting(true)

    // Add operation to GlobalStatusStore
    addOperation({
      id: operationId,
      type: 'text-to-3d',
      label: `Generating 3D: ${prompt.slice(0, 30)}...`,
      details: JSON.stringify({ prompt }),
      status: 'pending'
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
        console.warn('Failed to read Meshy API key from settings', err)
      }

      // Get master prompt for seed generation
      let masterPrompt = ''
      // Use useWorldStore to get the correct valid project ID
      const currentProject = useWorldStore.getState().currentProject
      const currentProjectId = currentProject?.id

      if (currentProjectId) {
        masterPrompt = localStorage.getItem(`${LocalStorageKeys.MASTER_PROMPT}-${currentProjectId}`) || ''
      }

      // Generate seed from master prompt + object prompt
      const seed = seedFromString(`${masterPrompt}|${prompt}`)

      const res = await fetch('/api/interior-designer/text-to-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId || 'default',
          prompt,
          seed,
          apiKey
        })
      })

      const data = await res.json()
      if (data.runId) {
        // Update operation with task ID
        updateOperation(operationId, {
          status: 'in-progress',
          details: JSON.stringify({ taskId: data.runId, prompt, seed })
        })
        toast.success('3D generation started!')
      } else {
        throw new Error(data.error || 'Failed to start generation')
      }
    } catch (e: any) {
      toast.error('Failed to start text-to-3d: ' + e.message)
      removeOperation(operationId)
    } finally {
      setIsStarting(false)
    }
  }

  const handleApply = () => {
    if (!currentOperation) return

    try {
      const metadata = JSON.parse(currentOperation.details || '{ }')
      if (metadata.modelUrl) {
        onModelGenerated(metadata.modelUrl)
        toast.success('3D model applied!')
      }
    } catch (e) {
      console.error('Failed to apply model', e)
    }

    removeOperation(operationId)
    setPrompt('')
  }

  const handleDiscard = () => {
    removeOperation(operationId)
    setPrompt('')
  }

  // COMPLETED STATE - Show Apply/Discard
  if (currentOperation && currentOperation.status === 'completed') {
    let thumbnailUrl = ''
    try {
      const metadata = JSON.parse(currentOperation.details || '{ }')
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
            <img src={thumbnailUrl} alt="Generated 3D preview" className="w-full h-24 object-cover" />
          </div>
        )}
        <div className="bg-muted/30 p-2 rounded text-xs mb-3 font-mono">
          New 3D model generated. Apply to replace current object.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleApply} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 font-mono text-xs">
            <Check size={14} className="mr-1" /> Apply
          </Button>
          <Button onClick={handleDiscard} size="sm" variant="destructive" className="w-full font-mono text-xs">
            <X size={14} className="mr-1" /> Discard
          </Button>
        </div>
      </div>
    )
  }

  // IN PROGRESS STATE - Show Loading
  if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 rounded gap-2">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="text-xs text-muted-foreground font-mono">
            {currentOperation.status === 'pending' ? 'Starting Job...' : 'Generating 3D Model...'}
          </span>
          <span className="text-[10px] text-muted-foreground">This may take several minutes</span>
        </div>
      </div>
    )
  }

  // FAILED STATE - Show Error
  if (currentOperation && currentOperation.status === 'failed') {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs">
          <p className="font-semibold text-destructive mb-1 font-mono uppercase tracking-wide">3D Generation Failed</p>
          <p className="text-muted-foreground mb-2">An error occurred while generating the model.</p>
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
        <label className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wide">Object Description</label>
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
          {isStarting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Box className="mr-2 h-3 w-3" />}
          Generate 3D Model
        </Button>
        <p className="text-[10px] text-muted-foreground font-mono">
          Uses Meshy AI to create a 3D model from text. Takes 2-5 minutes.
        </p>
      </div>
    </div>
  )
}
