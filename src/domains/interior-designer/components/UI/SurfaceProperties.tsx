'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { interiorDesignerApi } from '@/domains/interior-designer/io/interior-designer.api'
import { useInteriorStore, SurfaceType } from '@/domains/interior-designer/store/useInteriorStore'
import {
  Loader2,
  Wand2,
  Layers,
  Sparkles,
  Palette,
  Ruler,
  Trash2,
  ChevronDown,
  Mountain,
  X,
  Check,
  RotateCcw,
} from 'lucide-react'
import { SidebarSection, SidebarLabel, SidebarSliderRow } from '@/components/ui/domain-sidebar'
import { Switch } from '@/components/ui/switch'
import { TextureStyle } from '@/domains/interior-designer/ai/TextureService'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/lib/error-utils'

// Active task statuses that indicate work is still in progress
const ACTIVE_TASK_STATUSES = ['PENDING', 'QUEUED', 'EXECUTING', 'WAITING', 'DEQUEUED']

const PROMPT_PRESETS: Record<SurfaceType, string[]> = {
  grass: [
    'Lush green grass field',
    'Wild meadow with wildflowers',
    'Tall swaying grass',
    'Short manicured lawn',
  ],
  water: ['Deep blue ocean', 'Murky swamp water', 'Clear pool water', 'Frozen ice'],
  road: ['Cracked asphalt', 'Cobblestone street', 'Dirt path', 'Modern highway'],
  dirt: ['Rich dark soil patch', 'Dry cracked mud', 'Forest floor with leaves', 'Sandy loam'],
  pavement: ['Concrete slabs', 'Brick walkway', 'Hexagon tiles', 'Stone pavers'],
  mars: ['Red dusty martian soil', 'Alien rock formation', 'Crater surface', 'Rusty metal ground'],
  sand: ['Golden beach sand dunes', 'White desert dunes', 'Wet compact sand', 'Desert ripples'],
  rock: [
    'Grey mountain rocks',
    'Volcanic basalt formation',
    'Smooth river stones',
    'Jagged cliff rocks',
  ],
  wall: ['Stone wall', 'Brick wall', 'Wooden fence', 'Modern concrete wall'],
}

// 3D Material presets - more descriptive for 3D generation
const MATERIAL_3D_PRESETS: Record<SurfaceType, string[]> = {
  grass: [
    'Dense grass patch with varied heights',
    'Wildflower meadow with tall grass',
    'Tropical tall grass field',
    'Short clipped lawn grass',
  ],
  water: [
    'Coral reef underwater scene',
    'Lily pads on water',
    'Ice sheet with cracks',
    'Seaweed bed',
  ],
  road: [
    'Broken asphalt chunks',
    'Cobblestone path section',
    'Wooden planks walkway',
    'Gravel path',
  ],
  dirt: [
    'Plowed field rows',
    'Muddy terrain with puddles',
    'Root covered forest floor',
    'Rocky soil patch',
  ],
  pavement: [
    'Cracked concrete tiles',
    'Mossy brick pathway',
    'Hexagonal stone tiles',
    'Marble floor section',
  ],
  mars: [
    'Martian rock outcrop',
    'Alien crystal formation',
    'Meteor impact crater',
    'Rusted debris field',
  ],
  sand: ['Sand dunes with ripples', 'Beach with shells', 'Desert oasis patch', 'Quicksand pit'],
  rock: ['Boulder cluster', 'Volcanic rock formation', 'Cliff face section', 'Cave stalagmites'],
  wall: ['Medieval stone wall', 'Red brick wall', 'Graffiti covered concrete', 'Log cabin walls'],
}

const STYLE_OPTIONS: { value: TextureStyle; label: string }[] = [
  { value: 'painterly', label: 'Painterly' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'decay', label: 'Decay' },
  { value: 'metallic', label: 'Metallic' },
  { value: 'organic', label: 'Organic' },
]

type MaterialMode = '2d' | '3d'

// Slider with label
const LabeledSlider: React.FC<{
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit?: string
  minLabel?: string
  maxLabel?: string
}> = ({ label, value, onChange, min, max, step, unit = '', minLabel, maxLabel }) => (
  <div className="space-y-3 py-1">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500/80">
        {label}
      </span>
      <span className="text-[10px] font-bold text-indigo-400 font-mono">
        {value}
        {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className="cursor-pointer"
    />
    {(minLabel || maxLabel) && (
      <div className="flex justify-between text-[9px] text-zinc-600 font-bold uppercase tracking-tighter pt-0.5">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    )}
  </div>
)

// Progress stages for 3D generation
const getStageLabel = (stage: string | undefined, progress: number): string => {
  switch (stage) {
    case 'preview':
      return `Generating mesh... ${progress}%`
    case 'refine':
      return `Adding textures... ${progress}%`
    case 'saving':
      return `Saving model... ${progress}%`
    case 'completed':
      return 'Complete!'
    default:
      return `Processing... ${progress}%`
  }
}

export const SurfaceProperties: React.FC = () => {
  const selectedId = useInteriorStore(state => state.selectedId)
  const surfaces = useInteriorStore(state => state.surfaces)
  const updateSurface = useInteriorStore(state => state.updateSurface)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const createFloorFromSurface = useInteriorStore(state => state.createFloorFromSurface)
  const previewRetexture = useInteriorStore(state => state.previewRetexture)
  const approveRetexture = useInteriorStore(state => state.approveRetexture)
  const cancelRetexture = useInteriorStore(state => state.cancelRetexture)

  const selectedSurface = surfaces.find(s => s.id === selectedId)
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const setGroundColor = useInteriorStore(state => state.setGroundColor)
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const setTerrainBrushPixelate = useInteriorStore(state => state.setTerrainBrushPixelate)
  const setTerrainBrushFidelity = useInteriorStore(state => state.setTerrainBrushFidelity)

  // GlobalStatusStore for tracking 3D generation
  const operations = useGlobalStatusStore(state => state.operations)
  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  // Get current project
  const currentProject = useWorldStore(state => state.currentProject)

  // Mode toggle - default to 3D (Meshy) since 2D requires separate Stability API key
  const [mode, setMode] = useState<MaterialMode>('3d')

  // 2D Texture state
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<TextureStyle>('painterly')

  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(0.5)
  const [showPresets, setShowPresets] = useState(false)

  // 3D Material state
  const [isStarting3D, setIsStarting3D] = useState(false)

  // Get operation ID for this surface
  const operationId = selectedId ? `material-${selectedId}` : null
  const currentOperation = operationId ? operations.find(op => op.id === operationId) : null

  // Parse operation metadata
  const operationMeta = React.useMemo(() => {
    if (!currentOperation?.details) return null
    try {
      return JSON.parse(currentOperation.details)
    } catch {
      return null
    }
  }, [currentOperation?.details])

  useEffect(() => {
    if (selectedSurface) {
      setPrompt(selectedSurface.type)
      setPreviewUrl(null)
      setError(null)
      setStyle('painterly')
      setScale(selectedSurface.textureScale || 0.5)
    }
  }, [selectedSurface?.id])

  // Use a ref for operationMeta to avoid infinite re-render loop in polling effect
  const operationMetaRef = React.useRef(operationMeta)
  useEffect(() => {
    operationMetaRef.current = operationMeta
  }, [operationMeta])

  // Polling for 3D generation status
  useEffect(() => {
    if (!currentOperation || !operationId) return
    if (currentOperation.status === 'completed' || currentOperation.status === 'failed') return

    const checkStatus = async () => {
      const taskId = operationMetaRef.current?.taskId
      if (!taskId) return

      try {
        const data = await interiorDesignerApi.material.getStatus(taskId)
        const progress = data.metadata?.progress || 0
        const stage = data.metadata?.stage || 'processing'

        // Update progress in operation details
        updateOperation(operationId, {
          details: JSON.stringify({
            ...operationMetaRef.current,
            progress,
            stage,
          }),
        })

        if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
          const output = data.output
          if (output?.success && output?.modelUrl) {
            updateOperation(operationId, {
              status: 'completed',
              details: JSON.stringify({
                ...operationMetaRef.current,
                progress: 100,
                stage: 'completed',
                modelUrl: output.modelUrl,
                thumbnailUrl: output.thumbnailUrl,
              }),
            })
          }
        } else if (!ACTIVE_TASK_STATUSES.includes(data.status)) {
          updateOperation(operationId, {
            status: 'failed',
            details: JSON.stringify({
              ...operationMetaRef.current,
              error: data.error || 'Generation failed',
            }),
          })
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }

    // Poll every 5 seconds
    const pollInterval = setInterval(checkStatus, 5000)
    // Initial check
    checkStatus()

    return () => clearInterval(pollInterval)
  }, [operationId, currentOperation?.status, updateOperation])

  if (!selectedSurface) return null

  // 2D Texture generation handler
  const handleGenerate2D = async () => {
    if (!prompt) return

    setIsGenerating(true)
    setError(null)
    setPreviewUrl(null)

    try {
      const apiKey = localStorage.getItem(LocalStorageKeys.STABILITY_API_KEY_LEGACY)
      if (!apiKey) {
        toast.error('Stability API Key required for 2D textures. Go to Settings.')
        setIsGenerating(false)
        return
      }

      let width = 1024
      let height = 1024

      if (selectedSurface && (selectedSurface.isPath || selectedSurface.type === 'road')) {
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

  // 3D Material generation handler
  const handleGenerate3D = async () => {
    if (!prompt || !selectedSurface || !operationId) return

    // Prevent duplicate jobs
    if (
      currentOperation &&
      (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')
    ) {
      toast.error('3D generation already in progress')
      return
    }

    setIsStarting3D(true)
    setError(null)

    try {
      // Get Meshy API key
      let apiKey = ''
      try {
        const savedMeshy = localStorage.getItem(LocalStorageKeys.AI_CONFIG_MESHY)
        if (savedMeshy) {
          const config = JSON.parse(savedMeshy)
          apiKey = config.apiKey || ''
        }
      } catch (err) {
        console.warn('Failed to read Meshy API key', err)
      }

      if (!apiKey) {
        toast.error('Please set Meshy API Key in Settings')
        setIsStarting3D(false)
        return
      }

      // Calculate surface bounds
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

      // Add operation to GlobalStatusStore
      addOperation({
        id: operationId,
        type: 'material-gen',
        label: `Generating: ${prompt.slice(0, 25)}...`,
        details: JSON.stringify({
          prompt,
          surfaceId: selectedSurface.id,
          progress: 0,
          stage: 'starting',
        }),
        status: 'pending',
      })

      const data = await interiorDesignerApi.material.start({
        projectId: currentProject?.id || 'default',
        surfaceId: selectedSurface.id,
        prompt,
        apiKey,
        artStyle: 'realistic',
        surfaceBounds,
      })
      if (data.runId) {
        updateOperation(operationId, {
          status: 'in-progress',
          details: JSON.stringify({
            taskId: data.runId,
            prompt,
            surfaceId: selectedSurface.id,
            surfaceBounds,
            progress: 0,
            stage: 'preview',
          }),
        })
        toast.success('3D generation started! This may take a few minutes.')
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
      toast.error('Failed to start 3D generation: ' + getErrorMessage(e))
      if (operationId) removeOperation(operationId)
    } finally {
      setIsStarting3D(false)
    }
  }

  const handleApply2D = () => {
    if (previewUrl && selectedSurface) {
      updateSurface(selectedSurface.id, { texture: previewUrl })
      setPreviewUrl(null)
    }
  }

  const handleApply3D = () => {
    if (!operationMeta?.modelUrl || !selectedSurface) return

    // Use previewRetexture to replace the surface with the 3D model
    // Store original surface data in operation for potential revert
    const updatedMeta = {
      ...operationMeta,
      originalType: 'surface',
      originalData: selectedSurface,
      originalBoundingBox: {
        center: [
          operationMeta.surfaceBounds?.centerX || 0,
          0,
          operationMeta.surfaceBounds?.centerZ || 0,
        ],
        size: [operationMeta.surfaceBounds?.width || 1, 1, operationMeta.surfaceBounds?.depth || 1],
        min: [0, 0, 0],
      },
    }

    // Update operation with original data before preview
    if (operationId) {
      updateOperation(operationId, {
        details: JSON.stringify(updatedMeta),
      })
    }

    // Now call previewRetexture which will create the preview object
    previewRetexture(selectedSurface.id, operationMeta.modelUrl)

    // Approve immediately to finalize (surface is replaced with 3D object)
    setTimeout(() => {
      approveRetexture(selectedSurface.id)
      if (operationId) removeOperation(operationId)
      toast.success('3D material applied!')
    }, 100)
  }

  const handleDiscard3D = () => {
    if (operationId) {
      removeOperation(operationId)
    }
    setPrompt(selectedSurface.type)
  }

  const handleCancel3D = () => {
    // Cancel in-progress generation
    if (operationId) {
      removeOperation(operationId)
    }
    toast('Generation cancelled')
  }

  const surfaceLabel =
    selectedSurface.type === 'grass'
      ? 'Land'
      : selectedSurface.type.charAt(0).toUpperCase() + selectedSurface.type.slice(1)
  const isGroundType = ['grass', 'dirt', 'sand', 'rock', 'mars'].includes(selectedSurface.type)

  // Check if surface is being generated
  const isGenerating3D =
    currentOperation &&
    (currentOperation.status === 'pending' || currentOperation.status === 'in-progress')
  const is3DComplete = currentOperation?.status === 'completed'
  const is3DFailed = currentOperation?.status === 'failed'

  const presets = mode === '2d' ? PROMPT_PRESETS : MATERIAL_3D_PRESETS

  return (
    <div className="p-6 space-y-8">
      {/* Unified Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-zinc-300 font-bold uppercase text-[11px] tracking-widest">
          {isGroundType ? 'Terrain Surface' : 'Surface Properties'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl uppercase tracking-tight border border-indigo-500/20">
            {selectedSurface.type}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            onClick={() => removeSurface(selectedSurface.id)}
            title="Delete Surface"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Global Terrain Configuration (Quick Access) */}
      {isGroundType && (
        <SidebarSection title="Terrain Styles" icon={<Mountain size={12} />}>
          <div className="space-y-4 pt-1">
            {/* Voxel Mode Toggle */}
            <div className="flex items-center justify-between py-2">
              <SidebarLabel>Voxel Mode (Minecraft)</SidebarLabel>
              <Switch checked={terrainBrush.pixelate} onCheckedChange={setTerrainBrushPixelate} />
            </div>

            {/* Block Size - only when Voxel mode enabled */}
            {terrainBrush.pixelate && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <SidebarSliderRow
                  label="Block Size"
                  value={terrainBrush.fidelity}
                  min={1}
                  max={100}
                  step={1}
                  onChange={setTerrainBrushFidelity}
                  formatValue={v => `${(5 / v).toFixed(2)}m`}
                />
              </div>
            )}

            {/* Ground Color */}
            <div className="flex items-center justify-between py-2">
              <SidebarLabel className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                Ground
              </SidebarLabel>
              <div className="flex items-center gap-3 bg-muted/10 border border-border/50 p-1.5 rounded-xl">
                <input
                  type="color"
                  value={terrainSettings.groundColor}
                  onChange={e => setGroundColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border/40 cursor-pointer bg-transparent overflow-hidden"
                />
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {terrainSettings.groundColor.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Roughness Control */}
            <LabeledSlider
              label="Surface Roughness"
              value={selectedSurface.roughness ?? 0.8}
              onChange={v => updateSurface(selectedSurface.id, { roughness: v })}
              min={0}
              max={1}
              step={0.1}
              minLabel="Glossy"
              maxLabel="Matte"
            />

            {/* Metalness Control */}
            <LabeledSlider
              label="Surface Metalness"
              value={selectedSurface.metalness ?? 0}
              onChange={v => updateSurface(selectedSurface.id, { metalness: v })}
              min={0}
              max={1}
              step={0.1}
              minLabel="Plastic"
              maxLabel="Metallic"
            />
          </div>
        </SidebarSection>
      )}

      {/* Geometry Section - For Paths/Walls */}
      {(selectedSurface.isPath || selectedSurface.type === 'road') && (
        <SidebarSection title="Geometry" icon={<Ruler size={12} />}>
          <div className="space-y-4 pt-1">
            <LabeledSlider
              label="Width"
              value={selectedSurface.width ?? 2}
              onChange={v => updateSurface(selectedSurface.id, { width: v })}
              min={0.5}
              max={20}
              step={0.5}
              unit="m"
            />

            {selectedSurface.isVertical ? (
              <>
                <LabeledSlider
                  label="Height"
                  value={selectedSurface.height ?? 3}
                  onChange={v => updateSurface(selectedSurface.id, { height: v })}
                  min={0.5}
                  max={20}
                  step={0.5}
                  unit="m"
                />
                <LabeledSlider
                  label="Curvature"
                  value={selectedSurface.roundness ?? 0.5}
                  onChange={v => updateSurface(selectedSurface.id, { roundness: v })}
                  min={0}
                  max={1}
                  step={0.05}
                  minLabel="Sharp"
                  maxLabel="Beveled"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 h-10 rounded-2xl bg-white/5 border-white/5 hover:border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-all shadow-lg"
                  onClick={() => createFloorFromSurface(selectedSurface.id)}
                >
                  <Layers className="w-3.5 h-3.5 mr-2" />
                  Generate Floor Foundation
                </Button>
              </>
            ) : (
              <LabeledSlider
                label="Path Smoothness"
                value={selectedSurface.roundness ?? 0.5}
                onChange={v => updateSurface(selectedSurface.id, { roundness: v })}
                min={0}
                max={1}
                step={0.05}
                minLabel="Rigid"
                maxLabel="Organic"
              />
            )}
          </div>
        </SidebarSection>
      )}

      {/* AI Material Generation (Meshy) */}
      <SidebarSection title="AI Material (Meshy)" icon={<Palette size={12} />} separator>
        {/* 3D Generation In Progress */}
        {mode === '3d' && isGenerating3D && (
          <div className="space-y-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">
                  {getStageLabel(operationMeta?.stage, operationMeta?.progress || 0)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                onClick={handleCancel3D}
              >
                <X size={14} />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Progress value={operationMeta?.progress || 0} className="h-1 bg-white/5" />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>{operationMeta?.progress || 0}%</span>
                <span>AI RECONSTRUCTING...</span>
              </div>
            </div>
          </div>
        )}

        {/* 3D Generation Complete */}
        {mode === '3d' && is3DComplete && operationMeta?.modelUrl && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-green-500">
              <Check size={14} />
              <span className="text-xs font-mono font-medium">3D Material Ready</span>
            </div>

            {operationMeta.thumbnailUrl && (
              <div className="relative aspect-square rounded overflow-hidden border border-border bg-muted/20">
                <img
                  src={operationMeta.thumbnailUrl}
                  alt="Generated 3D Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply3D} className="flex-1 font-mono text-xs" size="sm">
                <Check size={12} className="mr-1.5" />
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={handleDiscard3D}
                className="flex-1 font-mono text-xs"
                size="sm"
              >
                <X size={12} className="mr-1.5" />
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* 3D Generation Failed */}
        {mode === '3d' && is3DFailed && (
          <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-500">
              <X size={14} />
              <span className="text-xs font-mono font-medium">Generation Failed</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {operationMeta?.error || 'An error occurred during generation.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard3D}
              className="w-full font-mono text-xs"
            >
              <RotateCcw size={12} className="mr-1.5" />
              Try Again
            </Button>
          </div>
        )}

        {/* Normal Input State (not generating, not complete) */}
        {!(isGenerating3D || is3DComplete || is3DFailed) && (
          <>
            {/* Style Selector - Only for 2D mode */}
            {mode === '2d' && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {STYLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border',
                      style === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                        : 'bg-white/5 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-white/10 hover:border-white/10'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Prompt Input */}
            <div className="relative mb-3 group">
              <Input
                placeholder={mode === '2d' ? 'Describe texture...' : 'Describe object...'}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={isGenerating || isStarting3D}
                className="pr-10 bg-white/5 border-white/10 rounded-2xl focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-[11px] h-10"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <Button
                  size="icon"
                  onClick={mode === '2d' ? handleGenerate2D : handleGenerate3D}
                  disabled={(mode === '2d' ? isGenerating : isStarting3D) || !prompt}
                  className={cn(
                    'h-7 w-7 rounded-xl transition-all shadow-lg',
                    prompt
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                      : 'bg-zinc-800 text-zinc-600 shadow-none'
                  )}
                >
                  {(mode === '2d' ? isGenerating : isStarting3D) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Presets Dropdown */}
            <div className="relative mb-3">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-2xl bg-white/3 border border-white/5 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all shadow-sm"
              >
                <span>Quick Presets</span>
                <ChevronDown
                  size={14}
                  className={cn('transition-transform duration-300', showPresets && 'rotate-180')}
                />
              </button>
              {showPresets && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 p-3 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-wrap gap-2">
                    {presets[selectedSurface.type]?.map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setPrompt(p)
                          setShowPresets(false)
                        }}
                        className="text-[9px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all font-bold uppercase tracking-tighter"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-[9px] text-zinc-500 italic leading-snug px-3 py-2 bg-white/2 border border-white/5 rounded-2xl">
              {mode === '2d'
                ? 'Generates a repeatable PBR texture using AI.'
                : 'Generates a fully detailed 3D model. Takes 2-5 minutes.'}
            </div>
          </>
        )}

        {error && (
          <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mb-3 font-mono">
            {error}
          </div>
        )}
      </SidebarSection>

      {/* 2D Preview */}
      {mode === '2d' && previewUrl && (
        <SidebarSection
          title="Generated Result"
          icon={<Sparkles size={12} />}
          className="animate-in fade-in zoom-in-95 duration-500"
          separator
        >
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer bg-white/5">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  Texture Preview
                </span>
              </div>
            </div>
            <Button
              onClick={handleApply2D}
              className="w-full h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 transition-all border-none"
            >
              <Check size={14} className="mr-2" />
              Apply Material
            </Button>
          </div>
        </SidebarSection>
      )}

      {/* Material Properties - When texture is applied */}
      {selectedSurface.texture && !previewUrl && (
        <SidebarSection title="Material Properties" icon={<Layers size={12} />} separator>
          <div className="flex gap-3 mb-4">
            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-white/5">
              <img
                src={selectedSurface.texture}
                alt="Current"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                  Texture Scale
                </SidebarLabel>
                <LabeledSlider
                  label=""
                  value={scale}
                  onChange={v => {
                    setScale(v)
                    updateSurface(selectedSurface.id, { textureScale: v })
                  }}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  unit="x"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 rounded-lg transition-all"
                onClick={() => updateSurface(selectedSurface.id, { texture: undefined })}
              >
                <Trash2 className="w-3.3 h-3.3 mr-2" />
                Remove Material
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Roughness
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={selectedSurface.roughness ?? 0.8}
                onChange={v => updateSurface(selectedSurface.id, { roughness: v })}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Metalness
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={selectedSurface.metalness ?? 0}
                onChange={v => updateSurface(selectedSurface.id, { metalness: v })}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>
        </SidebarSection>
      )}
    </div>
  )
}
