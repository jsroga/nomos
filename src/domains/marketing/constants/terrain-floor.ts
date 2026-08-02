/** Cursor-sculpted terrain floor tunables (eslint-exempt constants folder). */

export const DOM_EVENT_POINTER_MOVE = 'pointermove'

export enum TerrainFloorGrid {
  Cols = 160,
  Rows = 90,
  ColsMobile = 100,
  RowsMobile = 60,
  Width = 18,
  Depth = 11,
}

export const TERRAIN_FLOOR_CAMERA = {
  Fov: 55,
  PosX: 0,
  PosY: 2.4,
  PosZ: 6.8,
  LookX: 0,
  LookY: 0.5,
  LookZ: 0,
} as const

export enum TerrainFloorShape {
  BaseAmplitude = 0.55,
  BumpAmplitude = 0.45,
  BumpRadius = 0.9,
  ErodeRate = 1.8,
  DriftSpeed = 0.02,
  NoiseScale = 0.32,
}

export const TERRAIN_TRAIL_LENGTH = 12

export enum TerrainFloorStyle {
  PointSize = 1.6,
  PointSizeMobile = 1.3,
  MinStampDistancePx = 26,
  FadeInMs = 900,
}

/** Shared DPR cap for terrain WebGL (mobile + desktop). */
export const TERRAIN_FLOOR_MAX_PIXEL_RATIO = 1

export const TERRAIN_FLOOR_COLOR_LOW = '#312e81'
export const TERRAIN_FLOOR_COLOR_HIGH = '#818cf8'
