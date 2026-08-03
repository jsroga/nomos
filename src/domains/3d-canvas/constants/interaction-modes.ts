import type { InteractionMode } from '@/domains/3d-canvas/core/interior-types'

export const INTERACTION_MODE_SELECT: InteractionMode = 'SELECT'
export const INTERACTION_MODE_SCATTER: InteractionMode = 'SCATTER'
export const INTERACTION_MODE_WALL: InteractionMode = 'WALL'
export const INTERACTION_MODE_TERRAIN: InteractionMode = 'TERRAIN'
export const INTERACTION_MODE_OBJECT: InteractionMode = 'OBJECT'
export const INTERACTION_MODE_SURFACE: InteractionMode = 'SURFACE'

export enum InteriorObjectModel {
  Window = 'window',
  Door = 'door',
  Cube = 'cube',
  Sphere = 'sphere',
  Cylinder = 'cylinder',
  Cone = 'cone',
}

export enum InteriorSurfacePreset {
  Grass = 'grass',
  Road = 'road',
}

export enum TransformMode {
  Translate = 'translate',
  Rotate = 'rotate',
  Scale = 'scale',
}

export const INTERIOR_DRAG_EFFECT_MOVE = 'move'
