import type { Floor, SceneObject, Wall } from '@/domains/interior-designer/core/interior-types'
import { InteriorElementPropertyKey } from '@/domains/interior-designer/constants/properties-panel'

export type SelectedInteriorItem = Wall | Floor | SceneObject

export function isWall(item: unknown): item is Wall {
  return (
    typeof item === 'object' &&
    item !== null &&
    InteriorElementPropertyKey.Thickness in item
  )
}

export function isFloor(item: unknown): item is Floor {
  return (
    typeof item === 'object' &&
    item !== null &&
    InteriorElementPropertyKey.Points in item
  )
}

export function isObject(item: unknown): item is SceneObject {
  return (
    typeof item === 'object' &&
    item !== null &&
    InteriorElementPropertyKey.ModelUrl in item
  )
}
