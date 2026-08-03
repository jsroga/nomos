import type {
  GridResolution,
  SurfaceType,
} from '@/domains/3d-canvas/core/interior-types'

export enum SurfaceTypeValue {
  Grass = 'grass',
  Water = 'water',
  Road = 'road',
  Dirt = 'dirt',
  Pavement = 'pavement',
  Mars = 'mars',
  Sand = 'sand',
  Rock = 'rock',
  Wall = 'wall',
}

export enum GridResolutionValue {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum TerrainQualityValue {
  Medium = 'medium',
}

export enum TerrainBrushTypeValue {
  Raise = 'raise',
  Lower = 'lower',
  Flatten = 'flatten',
  Smooth = 'smooth',
}

export enum TerrainMaterialTypeValue {
  Ground = 'ground',
  Water = 'water',
}

export enum TerrainColor {
  Ground = '#4a7c59',
  Water = '#06b6d4',
}

export const GROUND_SURFACE_TYPE_VALUES: SurfaceType[] = [
  SurfaceTypeValue.Grass,
  SurfaceTypeValue.Dirt,
  SurfaceTypeValue.Sand,
  SurfaceTypeValue.Rock,
  SurfaceTypeValue.Mars,
]

export const GRID_RESOLUTION_MAP: Record<GridResolution, number> = {
  [GridResolutionValue.Low]: 32,
  [GridResolutionValue.Medium]: 64,
  [GridResolutionValue.High]: 128,
}

export enum InteriorDesignDefaultTitle {
  Untitled = 'Untitled Design',
}

export enum InteriorPersistenceLog {
  UpdateFailed = 'Failed to update design',
  CreateFailed = 'Failed to create design',
  SaveFailed = 'Failed to save design:',
  LoadFailed = 'Failed to load design:',
  DeleteFailed = 'Failed to delete design:',
}
