'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { SurfaceProperties } from './SurfaceProperties'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Move, RotateCw, Maximize, Layers, Check, X, Sparkles, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

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

  // Check Surface Selection First
  const selectedSurface = surfaces.find(s => s.id === selectedId)
  if (selectedSurface) {
    return (
      <div className="p-4">
        <h2 className="font-semibold mb-4">Properties</h2>
        <div className="text-xs font-mono bg-muted p-2 rounded mb-4">
          ID: {selectedSurface.id.slice(0, 8)}...
        </div>

        {/* COMBINED WALL CONTROLS (Top Priority) */}
        {selectedSurface.isVertical && (
          <div className="mb-6 p-3 bg-secondary/20 rounded border border-border">
            <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
              <Layers size={12} />
              Wall Settings
            </h3>

            <div className="space-y-4">
              {/* Roundness */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <label>Corner Roundness</label>
                  <span className="text-muted-foreground">{selectedSurface.roundness ?? 0.5}</span>
                </div>
                <Slider
                  value={[selectedSurface.roundness ?? 0.5]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(vals) => updateSurface(selectedSurface.id, { roundness: vals[0] })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Sharp</span>
                  <span>Round</span>
                </div>
              </div>

              {/* Generate Floor */}
              <button
                onClick={() => createFloorFromSurface(selectedSurface.id)}
                className="w-full bg-primary text-primary-foreground py-2 rounded text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm"
              >
                <Layers size={14} />
                Generate Floor
              </button>
            </div>
          </div>
        )}

        <SurfaceProperties />
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
        <div>
          <h2 className="font-semibold mb-1">Multi-Selection</h2>
          <div className="text-sm text-muted-foreground">{multiSelectedIds.length} items selected</div>
        </div>

        {allAreWalls && (
          <>
            {/* Batch Height */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <label>Batch Height</label>
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
            <div className="pt-4 border-t border-border space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Combine Roundness</label>
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

              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Merges selected walls into a single curved surface with the specified roundness.
              </div>
            </div>
          </>
        )}

        {!allAreWalls && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Multiple types selected. Actions limited.
          </div>
        )}
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
      <h2 className="font-semibold mb-4">Properties</h2>

      {/* Show snap controls in OBJECT mode */}
      {mode === 'OBJECT' && !selectedId && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground mb-2">Object Placement</div>
          <SnapControls />
        </div>
      )}

      {!selectedId && mode !== 'OBJECT' && (
        <div className="text-sm text-muted-foreground">
          {mode === 'SELECT' ? 'Select an object to edit properties' : `Mode: ${mode}`}
        </div>
      )}

      {selectedItem && (
        <div className="space-y-4">
          <div className="text-xs font-mono bg-muted p-2 rounded">
            ID: {selectedItem.id.slice(0, 8)}...
          </div>

          {/* Color/Texture Input */}
          <div>
            <label className="text-xs font-medium mb-1 block">Color / Texture</label>
            <input
              type="text"
              className="w-full bg-background border border-input rounded p-1 text-sm"
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
              <label className="text-xs font-medium mb-1 block">Height</label>
              <input
                type="number"
                className="w-full bg-background border border-input rounded p-1 text-sm"
                value={selectedItem.height}
                onChange={e => updateWall(selectedId!, { height: Number(e.target.value) })}
              />
            </div>
          )}


          {/* Object Transform Controls */}
          {isObject(selectedItem) && (
            <div className="space-y-4 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold mb-2">Transform Settings</h3>

              <SnapControls />

              {/* Mode Switcher */}
              <div className="flex bg-muted p-1 rounded-lg mb-3">
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

          <button
            onClick={handleDelete}
            className="w-full bg-destructive text-destructive-foreground py-2 rounded text-sm hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      )}
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
        <label className="text-xs font-medium">Lock Height (Y-Axis)</label>
        <Switch checked={lockY} onCheckedChange={setLockY} />
      </div>

      {/* Snapping */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Grid Snapping</label>
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
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium flex items-center gap-1.5">
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

  // Use GlobalStatusStore for job tracking
  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  const cancelRetexture = useInteriorStore(state => state.cancelRetexture)

  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const retextureModelBase64 = useInteriorStore(state => state.retextureModelBase64)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)

  // Find this element's operation
  const operationId = `retexture-${objectId}`
  const currentOperation = operations.find(op => op.id === operationId)

  // Auto-cleanup: Check stale operations on mount
  React.useEffect(() => {
    const cleanupStaleOperation = async () => {
      if (!currentOperation) return
      if (currentOperation.status === 'completed' || currentOperation.status === 'failed') return

      // Extract task ID
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
          console.warn(`[Retexture] Failed to fetch status for ${taskId}, marking as failed`)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: 'Task not found or API error', failureStatus: 'NOT_FOUND' })
          })
          return
        }

        const data = await res.json()
        console.log(`[Retexture] Stale check result for ${operationId}:`, data.status)

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                taskId,
                retexturedUrl: output.retexturedUrl
              })
            })
            console.log(`[Retexture] Stale operation ${operationId} was actually completed`)
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          console.warn(`[Retexture] Stale operation ${operationId} has failed status: ${data.status}`)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status })
          })
        }
      } catch (err) {
        console.error('[Retexture] Cleanup check error', err)
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
      console.log(`[Retexture] Polling stopped for ${operationId} - terminal state: ${currentOperation.status}`)
      return
    }

    console.log(`[Retexture] Starting polling for ${operationId} - status: ${currentOperation.status}`)

    let pollInterval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        // Re-check current state before making API call (in case it changed during interval)
        const latestOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
        if (!latestOp || latestOp.status === 'completed' || latestOp.status === 'failed') {
          console.log(`[Retexture] Skipping poll - operation is in terminal state or missing`)
          return
        }

        // Extract task ID from operation details
        let taskId: string | null = null
        try {
          const metadata = JSON.parse(currentOperation.details || '{}')
          taskId = metadata.taskId
        } catch (e) {
          console.error('Failed to parse operation metadata', e)
          return
        }

        if (!taskId) return

        const res = await fetch(`/api/interior-designer/retexture/${taskId}`)
        if (!res.ok) return
        const data = await res.json()

        console.log(`[Retexture] Poll result for ${operationId}:`, data.status)

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            // Store result in operation metadata
            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                taskId,
                retexturedUrl: output.retexturedUrl
              })
            })
            console.log(`[Retexture] Marked ${operationId} as completed`)
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          // Task is no longer active (FAILED, CANCELED, INTERRUPTED, SYSTEM_FAILURE, etc.)
          console.error('Retexture task failed or was terminated:', data.status, data.error)
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({ taskId, error: data.error, failureStatus: data.status })
          })
        }
      } catch (err) {
        console.error('Poll error', err)
      }
    }

    pollInterval = setInterval(checkStatus, POLLING_INTERVALS.DEFAULT)
    return () => {
      console.log(`[Retexture] Clearing interval for ${operationId}`)
      clearInterval(pollInterval)
    }
  }, [currentOperation, operationId, updateOperation])

  const triggerRetexture = React.useCallback(async (urlOrBase64: string) => {
    try {
      // Get Meshy API Key from local storage if available
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

      const res = await fetch('/api/interior-designer/retexture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUrlOrBase64: urlOrBase64,
          prompt,
          assetId: objectId,
          projectId: 'default',
          apiKey // Send the key to the backend
        })
      })
      const data = await res.json()
      if (data.runId) {
        // Update operation with task ID
        updateOperation(operationId, {
          status: 'in-progress',
          details: JSON.stringify({ taskId: data.runId })
        })
      } else {
        throw new Error(data.error)
      }
    } catch (e: any) {
      toast.error('Failed to start retexture: ' + e.message)
      removeOperation(operationId)
      setIsStarting(false)
    }
  }, [prompt, objectId, operationId, updateOperation, removeOperation])

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

    // DUPLICATE PREVENTION: Check if job already exists
    if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
      toast.error('Retexture job already in progress for this element')
      return
    }

    setIsStarting(true)

    // Add operation to GlobalStatusStore
    addOperation({
      id: operationId,
      type: 'retexture',
      label: `Retexturing Element`,
      details: JSON.stringify({ prompt }),
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

  // COMPLETED STATE - Show Approve/Reject
  if (currentOperation && currentOperation.status === 'completed') {
    return (
      <div className="pt-4 border-t border-border animate-in fade-in">
        <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 text-primary">
          <Sparkles size={12} />
          Review Result
        </h3>
        <div className="bg-muted/30 p-2 rounded text-xs mb-3">
          New texture generated. Approve to save.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => approveRetexture(objectId)} size="sm" className="w-full bg-green-600 hover:bg-green-700">
            <Check size={14} className="mr-1" /> Apply
          </Button>
          <Button onClick={() => cancelRetexture(objectId)} size="sm" variant="destructive" className="w-full">
            <X size={14} className="mr-1" /> Discard
          </Button>
        </div>
      </div>
    )
  }

  // IN PROGRESS STATE - Show Loading
  if (currentOperation && (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')) {
    return (
      <div className="pt-4 border-t border-border">
        <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded gap-2">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs text-muted-foreground">
            {currentOperation.status === 'pending' ? 'Starting Job...' : 'Generating Texture...'}
          </span>
        </div>
      </div>
    )
  }

  // FAILED STATE - Show Error
  if (currentOperation && currentOperation.status === 'failed') {
    return (
      <div className="pt-4 border-t border-border">
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
    <div className="pt-4 border-t border-border space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-purple-500" />
        <h3 className="text-xs font-semibold">AI Retexture</h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground">Description</label>
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Rusty metal, mossy stone..."
          className="text-xs h-8"
        />
        <Button
          onClick={handleGenerate}
          disabled={!prompt || isStarting}
          className="w-full h-8 text-xs"
          variant="outline"
        >
          {isStarting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
          Generate New Texture
        </Button>
      </div>
    </div>
  )
}
