import { RoadExtrudeSteps } from '@/domains/3d-canvas/constants/render-quality'

/** Cap ExtrudeGeometry steps so long roads stay interactive while sculpting. */
export function computeRoadExtrudeSteps(length: number): number {
  const raw = Math.ceil(length * RoadExtrudeSteps.PerUnitLength)
  return Math.min(RoadExtrudeSteps.Max, Math.max(RoadExtrudeSteps.Min, raw))
}
