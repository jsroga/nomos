'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { SurfaceProperties } from './SurfaceProperties'
import { Slider } from '@/components/ui/slider'
import { Move, RotateCw, Maximize, Layers, Check, X, Sparkles, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

      {!selectedId && (
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

              {/* Lock Y */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Lock Height (Y-Axis)</label>
                <input
                  type="checkbox"
                  checked={lockY}
                  onChange={e => setLockY(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Snapping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Grid Snapping</label>
                  <input
                    type="checkbox"
                    checked={snapEnabled}
                    onChange={e => setSnapEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>

                {snapEnabled && (
                  <div className="space-y-2 bg-muted/50 p-2 rounded">
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

import { LocalStorageKeys } from '@/constants/localStorage'

// Retexture Controls Component
function RetextureControls({ objectId, modelUrl }: { objectId: string, modelUrl: string }) {
  const [prompt, setPrompt] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)

  const isRetexturing = useInteriorStore(state => state.isRetexturing)
  const retextureTaskId = useInteriorStore(state => state.retextureTaskId)
  const pendingRetextureUrl = useInteriorStore(state => state.pendingRetextureUrl)

  const setRetextureState = useInteriorStore(state => state.setRetextureState)
  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  const cancelRetexture = useInteriorStore(state => state.cancelRetexture)

  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const retextureModelBase64 = useInteriorStore(state => state.retextureModelBase64)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)

  // Polling Logic
  React.useEffect(() => {
    if (!isRetexturing || !retextureTaskId || pendingRetextureUrl) return

    let pollInterval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/interior-designer/retexture/${retextureTaskId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output && output.success) {
            setRetextureState({
              pendingRetextureUrl: output.retexturedUrl
            })
          }
        } else if (data.status === 'FAILED' || data.status === 'CANCELED') {
          console.error('Retexture failed', data.error)
          setRetextureState({ isRetexturing: false, retextureTaskId: null })
        }
      } catch (err) {
        console.error('Poll error', err)
      }
    }

    pollInterval = setInterval(checkStatus, 3000)
    return () => clearInterval(pollInterval)
  }, [isRetexturing, retextureTaskId, pendingRetextureUrl, setRetextureState])

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
        setRetextureState({ retextureTaskId: data.runId })
      } else {
        throw new Error(data.error)
      }
    } catch (e: any) {
      alert('Failed to start retexture: ' + e.message)
      setRetextureState({ isRetexturing: false })
      setIsStarting(false)
    }
  }, [prompt, objectId, setRetextureState])

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
    setIsStarting(true)

    setRetextureState({ isRetexturing: true, retextureTaskId: null, pendingRetextureUrl: null, originalTextureUrl: modelUrl })
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

  if (isRetexturing) {
    if (pendingRetextureUrl) {
      // REVIEW STATE
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
            <Button onClick={approveRetexture} size="sm" className="w-full bg-green-600 hover:bg-green-700">
              <Check size={14} className="mr-1" /> Apply
            </Button>
            <Button onClick={cancelRetexture} size="sm" variant="destructive" className="w-full">
              <X size={14} className="mr-1" /> Discard
            </Button>
          </div>
        </div>
      )
    }

    // LOADING STATE
    return (
      <div className="pt-4 border-t border-border">
        <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded gap-2">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs text-muted-foreground">
            {retextureTaskId ? 'Generating Texture...' : 'Starting Job...'}
          </span>
        </div>
      </div>
    )
  }

  // IDLE STATE
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
