import type { InteractionMode } from '@/domains/3d-canvas/core/interior-types'

export const INTERACTION_MODE_OBJECT: InteractionMode = 'OBJECT'
export const INTERACTION_MODE_SCATTER: InteractionMode = 'SCATTER'
export const INTERACTION_MODE_TERRAIN: InteractionMode = 'TERRAIN'

export enum PrimitiveAssetId {
  Cube = 'cube',
  Sphere = 'sphere',
  Cylinder = 'cylinder',
  Cone = 'cone',
  Window = 'window',
  Door = 'door',
}

export enum DemoAssetId {
  Building = 'building',
  Tree = 'tree',
}

export enum PrimitiveAssetLabel {
  Cube = 'Cube',
  Sphere = 'Sphere',
  Cylinder = 'Cylinder',
  Cone = 'Cone',
  Window = 'Window',
  Door = 'Door',
}

export const PRIMITIVE_ASSETS = [
  { id: PrimitiveAssetId.Cube, name: PrimitiveAssetLabel.Cube },
  { id: PrimitiveAssetId.Sphere, name: PrimitiveAssetLabel.Sphere },
  { id: PrimitiveAssetId.Cylinder, name: PrimitiveAssetLabel.Cylinder },
  { id: PrimitiveAssetId.Cone, name: PrimitiveAssetLabel.Cone },
  { id: PrimitiveAssetId.Window, name: PrimitiveAssetLabel.Window },
  { id: PrimitiveAssetId.Door, name: PrimitiveAssetLabel.Door },
] as const

export enum InteriorSidebarTabId {
  Assets = 'assets',
  Properties = 'properties',
  Layers = 'layers',
}

export enum InteriorSidebarTabLabel {
  Assets = 'Assets',
  Properties = 'Properties',
  Terrain = 'Terrain',
  Layers = 'Layers',
}
