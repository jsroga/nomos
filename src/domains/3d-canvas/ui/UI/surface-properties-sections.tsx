'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarSliderRow } from '@/components/DomainSidebar'
import { Switch } from '@/components/Switch'
import { Slider } from '@/components/Slider'
import type { Surface } from '@/domains/3d-canvas'
import { GROUND_SURFACE_TYPE_VALUES, SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'
import { Layers, Mountain, Ruler, Trash2 } from 'lucide-react'

export const LabeledSlider: React.FC<{
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

interface SurfaceHeaderProps {
  selectedSurface: Surface
  isGroundType: boolean
  onRemove: () => void
}

export const SurfacePropertiesHeader: React.FC<SurfaceHeaderProps> = ({
  selectedSurface,
  isGroundType,
  onRemove,
}) => (
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
        onClick={onRemove}
        title="Delete Surface"
      >
        <Trash2 size={12} />
      </Button>
    </div>
  </div>
)

interface SurfaceTerrainSectionProps {
  selectedSurface: Surface
  terrainBrush: { pixelate: boolean; fidelity: number }
  groundColor: string
  onPixelateChange: (value: boolean) => void
  onFidelityChange: (value: number) => void
  onGroundColorChange: (value: string) => void
  onUpdateSurface: (updates: Partial<Surface>) => void
}

export const SurfaceTerrainSection: React.FC<SurfaceTerrainSectionProps> = ({
  selectedSurface,
  terrainBrush,
  groundColor,
  onPixelateChange,
  onFidelityChange,
  onGroundColorChange,
  onUpdateSurface,
}) => (
  <SidebarSection title="Terrain Styles" icon={<Mountain size={12} />}>
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between py-2">
        <SidebarLabel>Voxel Mode (Minecraft)</SidebarLabel>
        <Switch checked={terrainBrush.pixelate} onCheckedChange={onPixelateChange} />
      </div>

      {terrainBrush.pixelate && (
        <div className="animate-in fade-in slide-in-from-top-1">
          <SidebarSliderRow
            label="Block Size"
            value={terrainBrush.fidelity}
            min={1}
            max={100}
            step={1}
            onChange={onFidelityChange}
            formatValue={v => `${(5 / v).toFixed(2)}m`}
          />
        </div>
      )}

      <div className="flex items-center justify-between py-2">
        <SidebarLabel className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
          Ground
        </SidebarLabel>
        <div className="flex items-center gap-3 bg-muted/10 border border-border/50 p-1.5 rounded-xl">
          <input
            type="color"
            value={groundColor}
            onChange={e => onGroundColorChange(e.target.value)}
            className="w-8 h-8 rounded-lg border border-border/40 cursor-pointer bg-transparent overflow-hidden"
          />
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {groundColor.toUpperCase()}
          </span>
        </div>
      </div>

      <LabeledSlider
        label="Surface Roughness"
        value={selectedSurface.roughness ?? 0.8}
        onChange={v => onUpdateSurface({ roughness: v })}
        min={0}
        max={1}
        step={0.1}
        minLabel="Glossy"
        maxLabel="Matte"
      />

      <LabeledSlider
        label="Surface Metalness"
        value={selectedSurface.metalness ?? 0}
        onChange={v => onUpdateSurface({ metalness: v })}
        min={0}
        max={1}
        step={0.1}
        minLabel="Plastic"
        maxLabel="Metallic"
      />
    </div>
  </SidebarSection>
)

interface SurfaceGeometrySectionProps {
  selectedSurface: Surface
  onUpdateSurface: (updates: Partial<Surface>) => void
  onCreateFloor: () => void
}

export const SurfaceGeometrySection: React.FC<SurfaceGeometrySectionProps> = ({
  selectedSurface,
  onUpdateSurface,
  onCreateFloor,
}) => {
  if (!selectedSurface.isPath && selectedSurface.type !== SurfaceTypeValue.Road) {
    return null
  }

  return (
    <SidebarSection title="Geometry" icon={<Ruler size={12} />}>
      <div className="space-y-4 pt-1">
        <LabeledSlider
          label="Width"
          value={selectedSurface.width ?? 2}
          onChange={v => onUpdateSurface({ width: v })}
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
              onChange={v => onUpdateSurface({ height: v })}
              min={0.5}
              max={20}
              step={0.5}
              unit="m"
            />
            <LabeledSlider
              label="Curvature"
              value={selectedSurface.roundness ?? 0.5}
              onChange={v => onUpdateSurface({ roundness: v })}
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
              onClick={onCreateFloor}
            >
              <Layers className="w-3.5 h-3.5 mr-2" />
              Generate Floor Foundation
            </Button>
          </>
        ) : (
          <LabeledSlider
            label="Path Smoothness"
            value={selectedSurface.roundness ?? 0.5}
            onChange={v => onUpdateSurface({ roundness: v })}
            min={0}
            max={1}
            step={0.05}
            minLabel="Rigid"
            maxLabel="Organic"
          />
        )}
      </div>
    </SidebarSection>
  )
}

export function isGroundSurfaceType(type: Surface['type']): boolean {
  return GROUND_SURFACE_TYPE_VALUES.includes(type)
}
