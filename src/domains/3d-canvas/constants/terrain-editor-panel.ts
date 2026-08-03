import type { SurfaceType, TerrainBrushType, TerrainQuality } from '@/domains/3d-canvas/core/interior-types'

export enum TerrainBrushKind {
  Raise = 'raise',
  Lower = 'lower',
  Flatten = 'flatten',
  Smooth = 'smooth',
}

export const TERRAIN_BRUSH_TYPES: TerrainBrushType[] = [
  TerrainBrushKind.Raise,
  TerrainBrushKind.Lower,
  TerrainBrushKind.Flatten,
  TerrainBrushKind.Smooth,
]

export const TERRAIN_QUALITIES: TerrainQuality[] = ['low', 'medium', 'high']

export const TERRAIN_QUALITY_LABELS: Record<TerrainQuality, string> = {
  low: 'Low (8/m)',
  medium: 'Medium (16/m)',
  high: 'High (40/m)',
}

export const TERRAIN_BRUSH_LABELS: Record<TerrainBrushType, string> = {
  [TerrainBrushKind.Raise]: 'Raise',
  [TerrainBrushKind.Lower]: 'Lower',
  [TerrainBrushKind.Flatten]: 'Flatten',
  [TerrainBrushKind.Smooth]: 'Smooth',
}

export enum TerrainMaterialKind {
  Grass = 'grass',
  Dirt = 'dirt',
  Sand = 'sand',
  Rock = 'rock',
}

export const TERRAIN_MATERIAL_TYPES: SurfaceType[] = [
  TerrainMaterialKind.Grass,
  TerrainMaterialKind.Dirt,
  TerrainMaterialKind.Sand,
  TerrainMaterialKind.Rock,
]
