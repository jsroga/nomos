import type { SurfaceType } from '@/domains/interior-designer/core/interior-types'
import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'

export enum SurfaceGeometryKind {
  Shape = 'shape',
  Line = 'line',
  Curve = 'curve',
}

export enum SurfaceMaterialColor {
  Grass = '#4ade80',
  Water = '#06b6d4',
  Dirt = '#d97706',
  Road = '#374151',
  Pavement = '#9ca3af',
  Mars = '#9f3528',
  Sand = '#fcd34d',
  Rock = '#57534e',
  WallTool = '#a8a29e',
  White = 'white',
  Highlight = '#ffffff',
}

export interface SurfaceRenderConfig {
  color: string
  metalness: number
  roughness: number
  transmission?: number
  opacity?: number
  depth: number
  verticalOffset: number
}

export const SURFACE_RENDER_CONFIG: Record<SurfaceType, SurfaceRenderConfig> = {
  [SurfaceTypeValue.Grass]: {
    color: SurfaceMaterialColor.Grass,
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0,
  },
  [SurfaceTypeValue.Water]: {
    color: SurfaceMaterialColor.Water,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    opacity: 0.8,
    depth: 0.45,
    verticalOffset: -0.05,
  },
  [SurfaceTypeValue.Dirt]: {
    color: SurfaceMaterialColor.Dirt,
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0.005,
  },
  [SurfaceTypeValue.Road]: {
    color: SurfaceMaterialColor.Road,
    metalness: 0,
    roughness: 0.8,
    depth: 0.05,
    verticalOffset: 0.01,
  },
  [SurfaceTypeValue.Pavement]: {
    color: SurfaceMaterialColor.Pavement,
    metalness: 0,
    roughness: 0.5,
    depth: 0.2,
    verticalOffset: 0.01,
  },
  [SurfaceTypeValue.Mars]: {
    color: SurfaceMaterialColor.Mars,
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0,
  },
  [SurfaceTypeValue.Sand]: {
    color: SurfaceMaterialColor.Sand,
    metalness: 0,
    roughness: 0.9,
    depth: 0.5,
    verticalOffset: 0,
  },
  [SurfaceTypeValue.Rock]: {
    color: SurfaceMaterialColor.Rock,
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0.01,
  },
  [SurfaceTypeValue.Wall]: {
    color: SurfaceMaterialColor.Pavement,
    metalness: 0.1,
    roughness: 0.6,
    depth: 0.2,
    verticalOffset: 0.01,
  },
}

export const GROUND_TINT_SURFACE_TYPES: SurfaceType[] = [
  SurfaceTypeValue.Grass,
  SurfaceTypeValue.Dirt,
  SurfaceTypeValue.Sand,
  SurfaceTypeValue.Rock,
  SurfaceTypeValue.Mars,
]

export const SCULPTABLE_SURFACE_TYPES: SurfaceType[] = [
  ...GROUND_TINT_SURFACE_TYPES,
  SurfaceTypeValue.Road,
  SurfaceTypeValue.Pavement,
]
