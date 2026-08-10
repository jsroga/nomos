import * as THREE from 'three'
import { vec3, vec3XZ } from '../../core/vec3'
import type { Surface } from '../../core/interior-types'
import {
  SCENE_CURVE_TYPE_CATMULLROM,
  SCENE_CURVED_FLOOR_ERROR,
} from '../../constants/scene-slice-log'

export function buildCurvedFloorPoints(
  surface: Surface
): Array<[number, number, number]> {
  let floorPoints = surface.points.map(p => vec3XZ(p[0], p[2]))

  if (!surface.curved || surface.points.length <= 2) {
    return floorPoints
  }

  try {
    const points = surface.points.map(p => new THREE.Vector3(p[0], 0, p[2]))
    const first = points[0]
    const last = points[points.length - 1]
    const isClosed = first.distanceTo(last) < 0.2
    const curvePoints = isClosed ? points.slice(0, -1) : points
    const tension = surface.roundness ?? 0.5
    const curve = new THREE.CatmullRomCurve3(
      curvePoints,
      isClosed,
      SCENE_CURVE_TYPE_CATMULLROM,
      tension
    )
    const length = curve.getLength()
    const steps = Math.max(20, Math.ceil(length * 5))
    const spacedPoints = curve.getSpacedPoints(steps)
    floorPoints = spacedPoints.map(p => vec3(p.x, 0, p.z))
  } catch (e) {
    console.error(SCENE_CURVED_FLOOR_ERROR, e)
  }

  return floorPoints
}
