import * as THREE from 'three'
import type { SceneObject } from '@/domains/3d-canvas'

export function computeAutoScale(
  naturalSize: THREE.Vector3,
  targetDimensions: [number, number, number]
): [number, number, number] {
  const [targetX, targetY, targetZ] = targetDimensions

  const scaleX = naturalSize.x > 0.01 ? targetX / naturalSize.x : 1
  const scaleY = naturalSize.y > 0.01 ? targetY / naturalSize.y : 1
  const scaleZ = naturalSize.z > 0.01 ? targetZ / naturalSize.z : 1

  return [scaleX, scaleY, scaleZ]
}

export function shouldApplyAutoScale(obj: SceneObject): obj is SceneObject & {
  targetDimensions: [number, number, number]
} {
  return obj.targetDimensions !== undefined
}
