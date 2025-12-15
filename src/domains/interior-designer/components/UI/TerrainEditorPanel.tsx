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

interface SectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const Section: React.FC<SectionProps> = ({ title, icon, children, className }) => (
  <div className={cn('bg-card/50 rounded-lg border border-border p-4', className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {children}
  </div>
)

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

  // Initialize heightmap if not already done
  React.useEffect(() => {
    if (!terrainSettings.heightmap) {
      initializeHeightmap(terrainSettings.heightmapSize)
    }
  }, [terrainSettings.heightmap, terrainSettings.heightmapSize, initializeHeightmap])

  const brushTypes: Array<{ type: 'raise' | 'lower' | 'flatten' | 'smooth', label: string }> = [
    { type: 'raise', label: 'Raise' },
    { type: 'lower', label: 'Lower' },
    { type: 'flatten', label: 'Flatten' },
    { type: 'smooth', label: 'Smooth' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg">Terrain & Water Editor</h2>
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
      <Section title="Global Levels" icon={<SlidersHorizontal size={16} />}>
        <div className="space-y-4">
          {/* Base Ground Height */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Base Ground Ht (0m)</label>
              <span className="text-muted-foreground font-mono">{terrainSettings.baseGroundHeight}m</span>
            </div>
            <Slider
              value={[terrainSettings.baseGroundHeight]}
              min={-10}
              max={10}
              step={0.5}
              onValueChange={([val]) => setBaseGroundHeight(val)}
            />
          </div>

          {/* Water Surface Height */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Water Surface Ht ({terrainSettings.waterSurfaceHeight}m)</label>
              <span className="text-muted-foreground font-mono">{terrainSettings.waterSurfaceHeight}m</span>
            </div>
            <Slider
              value={[terrainSettings.waterSurfaceHeight]}
              min={-10}
              max={10}
              step={0.5}
              onValueChange={([val]) => setWaterSurfaceHeight(val)}
              className="[&_[role=slider]]:bg-cyan-500"
            />
          </div>

          {/* Show Water Plane Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Show Water Plane</label>
            <Switch
              checked={terrainSettings.showWaterPlane}
              onCheckedChange={setShowWaterPlane}
            />
          </div>
        </div>
      </Section>

      {/* Section 2: Sculpting Brushes */}
      <Section title="Sculpting Brushes" icon={<Brush size={16} />}>
        <div className="space-y-4">
          {/* Brush Type Toggles */}
          <div className="grid grid-cols-4 gap-2">
            {brushTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setTerrainBrushType(type)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all',
                  terrainBrush.type === type
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <BrushIcon type={type} size={24} />
                <span className="text-[10px] mt-1 font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Brush Size</label>
              <span className="text-muted-foreground font-mono">{terrainBrush.size}</span>
            </div>
            <Slider
              value={[terrainBrush.size]}
              min={1}
              max={50}
              step={1}
              onValueChange={([val]) => setTerrainBrushSize(val)}
            />
          </div>

          {/* Strength */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Strength</label>
              <span className="text-muted-foreground font-mono">{terrainBrush.strength}</span>
            </div>
            <Slider
              value={[terrainBrush.strength]}
              min={1}
              max={20}
              step={1}
              onValueChange={([val]) => setTerrainBrushStrength(val)}
            />
          </div>
        </div>
      </Section>

      {/* Section 3: Material Paint */}
      <Section title="Material Paint" icon={<PaintBucket size={16} />}>
        <div className="space-y-4">
          {/* Material Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTerrainMaterial('ground')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                terrainMaterialPaint.activeMaterial === 'ground'
                  ? 'border-amber-600 bg-amber-600/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="w-8 h-8 rounded bg-amber-700 flex items-center justify-center">
                <Square size={16} className="text-amber-200" />
              </div>
              <span className="text-sm font-medium">Ground (Pavement/Grass)</span>
            </button>

            <button
              onClick={() => setTerrainMaterial('water')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                terrainMaterialPaint.activeMaterial === 'water'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="w-8 h-8 rounded bg-cyan-600 flex items-center justify-center">
                <Droplets size={16} className="text-cyan-200" />
              </div>
              <span className="text-sm font-medium">Water Source</span>
            </button>
          </div>

          {/* Auto-Fill Water Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={autoFillWaterBelowLevel}
          >
            <Wand2 size={16} />
            Auto-Fill Water below Level
          </Button>

          <p className="text-xs text-muted-foreground">
            Automatically marks all terrain below the water surface height as water.
          </p>
        </div>
      </Section>
    </div>
  )
}

