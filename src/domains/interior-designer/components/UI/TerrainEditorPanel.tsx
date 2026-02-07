'use client'

import React from 'react'
import {
  useInteriorStore,
  TerrainQuality,
} from '@/domains/interior-designer/store/useInteriorStore'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  ChevronUp,
  ChevronDown,
  Minus,
  Waves,
  RotateCcw,
  Brush,
  Settings2,
  Box,
  Palette,
  Square,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { SidebarSection, SidebarLabel } from '@/components/ui/domain-sidebar'

// Brush type icon component
const BrushIcon: React.FC<{ type: 'raise' | 'lower' | 'flatten' | 'smooth'; size?: number }> = ({
  type,
  size = 18,
}) => {
  switch (type) {
    case 'raise':
      return <ChevronUp size={size} />
    case 'lower':
      return <ChevronDown size={size} />
    case 'flatten':
      return <Minus size={size} />
    case 'smooth':
      return <Waves size={size} />
  }
}

// Quality preset labels
const qualityLabels: Record<TerrainQuality, string> = {
  low: 'Low (8/m)',
  medium: 'Medium (16/m)',
  high: 'High (40/m)',
}

export const TerrainEditorPanel: React.FC = () => {
  // Terrain Settings
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const setBaseGroundHeight = useInteriorStore(state => state.setBaseGroundHeight)
  const setWaterSurfaceHeight = useInteriorStore(state => state.setWaterSurfaceHeight)
  const setShowWaterPlane = useInteriorStore(state => state.setShowWaterPlane)
  const setTerrainQuality = useInteriorStore(state => state.setTerrainQuality)
  const setGroundColor = useInteriorStore(state => state.setGroundColor)
  const setWaterColor = useInteriorStore(state => state.setWaterColor)
  const setWaterOpacity = useInteriorStore(state => state.setWaterOpacity)
  const setSunAngle = useInteriorStore(state => state.setSunAngle)
  const initializeHeightmap = useInteriorStore(state => state.initializeHeightmap)

  // Brush Settings
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const setTerrainBrushType = useInteriorStore(state => state.setTerrainBrushType)
  const setTerrainBrushSize = useInteriorStore(state => state.setTerrainBrushSize)
  const setTerrainBrushStrength = useInteriorStore(state => state.setTerrainBrushStrength)
  const setTerrainBrushFidelity = useInteriorStore(state => state.setTerrainBrushFidelity)
  const setTerrainBrushPixelate = useInteriorStore(state => state.setTerrainBrushPixelate)

  // Material Paint Settings (kept for future use but not used in simplified UI)
  const resetTerrain = useInteriorStore(state => state.resetTerrain)

  const brushTypes: Array<{ type: 'raise' | 'lower' | 'flatten' | 'smooth'; label: string }> = [
    { type: 'raise', label: 'Raise' },
    { type: 'lower', label: 'Lower' },
    { type: 'flatten', label: 'Flatten' },
    { type: 'smooth', label: 'Smooth' },
  ]

  // Section 5: Advanced (Hidable)
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Check if there are any ground surfaces (grass, dirt, sand, rock)
  const surfaces = useInteriorStore(state => state.surfaces)
  const groundSurfaceTypes = ['grass', 'dirt', 'sand', 'rock']
  const hasGroundSurface = surfaces.some(s => groundSurfaceTypes.includes(s.type))

  // Auto-initialize heightmap when ground surface exists but heightmap doesn't
  React.useEffect(() => {
    if (hasGroundSurface && !terrainSettings.heightmap) {
      initializeHeightmap(terrainSettings.heightmapSize)
    }
  }, [
    hasGroundSurface,
    terrainSettings.heightmap,
    terrainSettings.heightmapSize,
    initializeHeightmap,
  ])

  // Show message when no ground surface exists
  if (!hasGroundSurface) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
          <Square size={32} className="text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-zinc-200 font-bold uppercase tracking-widest text-xs">
            No Terrain Foundation
          </h3>
          <p className="text-[10px] text-zinc-500 max-w-[180px] leading-relaxed">
            Place a ground surface first using the Surface tool (grass, dirt, sand, rock, or mars).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-8">
      <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-2">
        <h2 className="text-indigo-400/90 font-mono font-bold uppercase text-xs tracking-widest">
          Atmosphere & Terrain
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all"
          onClick={resetTerrain}
          title="Reset"
        >
          <RotateCcw size={14} />
        </Button>
      </div>

      {/* Section 1: Sculpting Brushes */}
      <SidebarSection title="Sculpting Brushes" icon={<Brush size={12} />}>
        <div className="space-y-6 pt-2">
          {/* Brush Type Toggles */}
          <div className="grid grid-cols-4 gap-2">
            {brushTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setTerrainBrushType(type)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-500 group',
                  terrainBrush.type === type
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105 z-10'
                    : 'border-white/5 bg-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                )}
              >
                <div
                  className={cn(
                    'transition-transform duration-500',
                    terrainBrush.type === type ? 'scale-110' : 'group-hover:scale-110'
                  )}
                >
                  <BrushIcon type={type} />
                </div>
                <span className="text-[8px] mt-2 font-black uppercase tracking-widest">
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Brush Size
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={terrainBrush.size}
                min={1}
                max={50}
                step={1}
                onChange={setTerrainBrushSize}
                unit="m"
              />
            </div>

            <div className="space-y-2">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Sculpt Strength
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={terrainBrush.strength}
                min={1}
                max={20}
                step={1}
                onChange={setTerrainBrushStrength}
              />
            </div>
          </div>
        </div>
      </SidebarSection>

      {/* Section 2: Voxel Mode */}
      <SidebarSection title="Voxel Mode" icon={<Box size={12} />} separator>
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
              Voxel Transformation
            </SidebarLabel>
            <Switch checked={terrainBrush.pixelate} onCheckedChange={setTerrainBrushPixelate} />
          </div>

          {terrainBrush.pixelate && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Block Fidelity
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={terrainBrush.fidelity}
                min={1}
                max={100}
                step={1}
                onChange={setTerrainBrushFidelity}
                formatValue={v => `${(5 / v).toFixed(2)}m`}
              />
            </div>
          )}
        </div>
      </SidebarSection>

      {/* Section 3: Colors */}
      <SidebarSection title="Surface Tint" icon={<Palette size={12} />} separator>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <SidebarLabel className="text-[10px] font-black uppercase tracking-tight text-zinc-400">
              Ground
            </SidebarLabel>
            <div className="flex items-center gap-3 bg-white/3 border border-white/5 p-1.5 rounded-2xl">
              <input
                type="color"
                value={terrainSettings.groundColor}
                onChange={e => setGroundColor(e.target.value)}
                className="w-8 h-8 rounded-xl border border-white/10 cursor-pointer bg-transparent overflow-hidden"
              />
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                {terrainSettings.groundColor.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLabel className="text-[10px] font-black uppercase tracking-tight text-zinc-400">
              Water
            </SidebarLabel>
            <div className="flex items-center gap-3 bg-white/3 border border-white/5 p-1.5 rounded-2xl">
              <input
                type="color"
                value={terrainSettings.waterColor}
                onChange={e => setWaterColor(e.target.value)}
                className="w-8 h-8 rounded-xl border border-white/10 cursor-pointer bg-transparent overflow-hidden"
              />
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                {terrainSettings.waterColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </SidebarSection>

      {/* Section 4: Water Plane */}
      <SidebarSection title="Water Plane" icon={<Waves size={12} />} separator>
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
              Simulate Water
            </SidebarLabel>
            <Switch checked={terrainSettings.showWaterPlane} onCheckedChange={setShowWaterPlane} />
          </div>

          {terrainSettings.showWaterPlane && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-2">
                <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                  Surface Elevation
                </SidebarLabel>
                <LabeledSlider
                  label=""
                  value={terrainSettings.waterSurfaceHeight}
                  min={-10}
                  max={10}
                  step={0.5}
                  onChange={setWaterSurfaceHeight}
                  unit="m"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                    Translucency
                  </SidebarLabel>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    {Math.round(terrainSettings.waterOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={[Math.round(terrainSettings.waterOpacity * 100)]}
                  onValueChange={vals => setWaterOpacity(vals[0] / 100)}
                />
              </div>
            </div>
          )}
        </div>
      </SidebarSection>

      {/* Section 5: Advanced (Hidable) */}
      <div className="pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-white/3 border border-white/5 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={12} />
            <span>Optimization & Lighting</span>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-300',
              showAdvanced ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>

        {showAdvanced && (
          <div className="mt-4 p-5 rounded-3xl border border-white/5 bg-white/2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl shadow-black/20">
            <div className="space-y-2">
              <SidebarLabel className="text-zinc-500 font-bold tracking-tighter text-[10px] uppercase opacity-70">
                Atmospheric Sun Angle
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={terrainSettings.sunAngle}
                min={0}
                max={360}
                step={5}
                onChange={setSunAngle}
                unit="°"
              />
            </div>

            <div className="space-y-2">
              <SidebarLabel className="text-zinc-500 font-bold tracking-tighter text-[10px] uppercase opacity-70">
                Global Base Elevation
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={terrainSettings.baseGroundHeight}
                min={-10}
                max={10}
                step={0.5}
                onChange={setBaseGroundHeight}
                unit="m"
              />
            </div>

            <div className="space-y-3">
              <SidebarLabel className="text-zinc-500 font-bold tracking-tighter text-[10px] uppercase opacity-70">
                Simulation Quality
              </SidebarLabel>
              <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
                {(['low', 'medium', 'high'] as TerrainQuality[]).map(q => (
                  <button
                    key={q}
                    onClick={() => setTerrainQuality(q)}
                    className={cn(
                      'flex-1 py-1.5 text-[9px] rounded-md font-bold uppercase tracking-tight transition-all',
                      terrainSettings.quality === q
                        ? 'bg-zinc-100 text-zinc-950 shadow-lg'
                        : 'text-zinc-600 hover:text-zinc-400'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 italic leading-snug px-1">
                Higher density increases sculpting precision but impacts simulation performance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Copy-paste helper - LabeledSlider
const LabeledSlider: React.FC<{
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit?: string
  formatValue?: (v: number) => string
}> = ({ value, onChange, min, max, step, unit = '', formatValue }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] font-mono text-zinc-500 font-bold">
        {formatValue ? formatValue(value) : value}
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
  </div>
)
