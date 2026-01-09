'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  ChevronUp,
  ChevronDown,
  Minus,
  Waves,
  Square,
  Droplets,
  Wand2,
  RotateCcw,
  Brush,
  SlidersHorizontal,
  PaintBucket
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarSection, SidebarHeader, SidebarLabel, SidebarSliderRow, SidebarToggleRow } from '@/components/ui/domain-sidebar'

// Brush type icon component
const BrushIcon: React.FC<{ type: 'raise' | 'lower' | 'flatten' | 'smooth', size?: number }> = ({ type, size = 20 }) => {
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



export const TerrainEditorPanel: React.FC = () => {
  // Terrain Settings
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const setBaseGroundHeight = useInteriorStore(state => state.setBaseGroundHeight)
  const setWaterSurfaceHeight = useInteriorStore(state => state.setWaterSurfaceHeight)
  const setShowWaterPlane = useInteriorStore(state => state.setShowWaterPlane)
  const initializeHeightmap = useInteriorStore(state => state.initializeHeightmap)

  // Brush Settings
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const setTerrainBrushType = useInteriorStore(state => state.setTerrainBrushType)
  const setTerrainBrushSize = useInteriorStore(state => state.setTerrainBrushSize)
  const setTerrainBrushStrength = useInteriorStore(state => state.setTerrainBrushStrength)

  // Material Paint Settings
  const terrainMaterialPaint = useInteriorStore(state => state.terrainMaterialPaint)
  const setTerrainMaterial = useInteriorStore(state => state.setTerrainMaterial)
  const autoFillWaterBelowLevel = useInteriorStore(state => state.autoFillWaterBelowLevel)
  const resetTerrain = useInteriorStore(state => state.resetTerrain)

  const brushTypes: Array<{ type: 'raise' | 'lower' | 'flatten' | 'smooth', label: string }> = [
    { type: 'raise', label: 'Raise' },
    { type: 'lower', label: 'Lower' },
    { type: 'flatten', label: 'Flatten' },
    { type: 'smooth', label: 'Smooth' },
  ]

  // Check if there are any ground surfaces (grass, dirt, sand, rock)
  const surfaces = useInteriorStore(state => state.surfaces)
  const groundSurfaceTypes = ['grass', 'dirt', 'sand', 'rock']
  const hasGroundSurface = surfaces.some(s => groundSurfaceTypes.includes(s.type))

  // Show message when no ground surface exists
  if (!hasGroundSurface) {
    return (
      <div className="p-4 space-y-4">
        <SidebarHeader>Terrain & Water Editor</SidebarHeader>
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Square size={32} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center font-mono">
            Place a ground surface first using the Surface tool (grass, dirt, sand, or rock).
          </p>
        </div>
      </div>
    )
  }

  // Auto-initialize heightmap when ground surface exists but heightmap doesn't
  React.useEffect(() => {
    if (hasGroundSurface && !terrainSettings.heightmap) {
      initializeHeightmap(terrainSettings.heightmapSize)
    }
  }, [hasGroundSurface, terrainSettings.heightmap, terrainSettings.heightmapSize, initializeHeightmap])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <SidebarHeader>Terrain & Water Editor</SidebarHeader>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={resetTerrain}
          title="Reset Terrain"
        >
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Section 1: Global Levels */}
      <SidebarSection title="Global Levels" icon={<SlidersHorizontal size={12} />}>
        <div className="space-y-4">
          {/* Base Ground Height */}
          <SidebarSliderRow
            label="Base Ground Ht (0m)"
            value={terrainSettings.baseGroundHeight}
            min={-10}
            max={10}
            step={0.5}
            onChange={setBaseGroundHeight}
            formatValue={(v) => `${v}m`}
          />

          {/* Water Surface Height */}
          <SidebarSliderRow
            label={`Water Surface Ht (${terrainSettings.waterSurfaceHeight}m)`}
            value={terrainSettings.waterSurfaceHeight}
            min={-10}
            max={10}
            step={0.5}
            onChange={setWaterSurfaceHeight}
            formatValue={(v) => `${v}m`}
          />

          {/* Show Water Plane Toggle */}
          <SidebarToggleRow
            label="Show Water Plane"
            checked={terrainSettings.showWaterPlane}
            onChange={setShowWaterPlane}
          />
        </div>
      </SidebarSection>

      {/* Section 2: Sculpting Brushes */}
      <SidebarSection title="Sculpting Brushes" icon={<Brush size={12} />} separator>
        <div className="space-y-4">
          {/* Brush Type Toggles */}
          <div className="grid grid-cols-4 gap-2">
            {brushTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setTerrainBrushType(type)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-sm border-2 transition-all',
                  terrainBrush.type === type
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <BrushIcon type={type} size={24} />
                <span className="text-[10px] mt-1 font-mono font-medium uppercase">{label}</span>
              </button>
            ))}
          </div>

          {/* Brush Size */}
          <SidebarSliderRow
            label="Brush Size"
            value={terrainBrush.size}
            min={1}
            max={50}
            step={1}
            onChange={setTerrainBrushSize}
          />

          {/* Strength */}
          <SidebarSliderRow
            label="Strength"
            value={terrainBrush.strength}
            min={1}
            max={20}
            step={1}
            onChange={setTerrainBrushStrength}
          />
        </div>
      </SidebarSection>

      {/* Section 3: Material Paint */}
      <SidebarSection title="Material Paint" icon={<PaintBucket size={12} />} separator>
        <div className="space-y-4">
          {/* Material Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTerrainMaterial('ground')}
              className={cn(
                'flex flex-col items-start gap-2 p-3 rounded-sm border-2 transition-all h-full text-left',
                terrainMaterialPaint.activeMaterial === 'ground'
                  ? 'border-amber-600 bg-amber-600/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="w-8 h-8 rounded-sm bg-amber-700 flex items-center justify-center shrink-0">
                <Square size={16} className="text-amber-200" />
              </div>
              <span className="text-xs font-mono font-medium leading-tight">Ground</span>
            </button>

            <button
              onClick={() => setTerrainMaterial('water')}
              className={cn(
                'flex flex-col items-start gap-2 p-3 rounded-sm border-2 transition-all h-full text-left',
                terrainMaterialPaint.activeMaterial === 'water'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="w-8 h-8 rounded-sm bg-cyan-600 flex items-center justify-center shrink-0">
                <Droplets size={16} className="text-cyan-200" />
              </div>
              <span className="text-xs font-mono font-medium leading-tight">Water Source</span>
            </button>
          </div>

          {/* Auto-Fill Water Button */}
          <Button
            variant="outline"
            className="w-full gap-2 font-mono text-xs rounded-sm h-9"
            onClick={autoFillWaterBelowLevel}
          >
            <Wand2 size={16} />
            Auto-Fill Water below Level
          </Button>

          <p className="text-[10px] font-mono text-muted-foreground">
            Automatically marks all terrain below the water surface height as water.
          </p>
        </div>
      </SidebarSection>
    </div>
  )
}

