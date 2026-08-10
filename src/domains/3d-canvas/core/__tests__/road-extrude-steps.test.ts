import { describe, expect, it } from 'vitest'
import { computeRoadExtrudeSteps } from '@/domains/3d-canvas/core/road-extrude-steps'
import { RoadExtrudeSteps } from '@/domains/3d-canvas/constants/render-quality'

describe('computeRoadExtrudeSteps', () => {
  it('respects min and max caps', () => {
    expect(computeRoadExtrudeSteps(0.1)).toBe(RoadExtrudeSteps.Min)
    expect(computeRoadExtrudeSteps(1000)).toBe(RoadExtrudeSteps.Max)
  })

  it('scales with length inside the band', () => {
    const steps = computeRoadExtrudeSteps(10)
    expect(steps).toBeGreaterThanOrEqual(RoadExtrudeSteps.Min)
    expect(steps).toBeLessThanOrEqual(RoadExtrudeSteps.Max)
    expect(steps).toBe(Math.ceil(10 * RoadExtrudeSteps.PerUnitLength))
  })
})
