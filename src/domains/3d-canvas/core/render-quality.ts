import {
  RenderQuality,
  RenderQualityDpr,
  ShadowMapSize,
} from '@/domains/3d-canvas/constants/render-quality'
import type { TerrainQuality } from '@/domains/3d-canvas/core/interior-types'

export interface EffectiveRenderConfig {
  shadowsEnabled: boolean
  shadowMapSize: number
  dpr: number | [number, number]
  bloom: boolean
  noise: boolean
  vignette: boolean
  postFxEnabled: boolean
  usePhysicalMaterials: boolean
  waterTransmission: boolean
  terrainQualityCap: TerrainQuality
  roadDeferNormals: boolean
  voxelLodMultiplier: number
}

function baseConfig(quality: RenderQuality): EffectiveRenderConfig {
  switch (quality) {
    case RenderQuality.Low:
      return {
        shadowsEnabled: false,
        shadowMapSize: ShadowMapSize.Off,
        dpr: RenderQualityDpr.Low,
        bloom: false,
        noise: false,
        vignette: false,
        postFxEnabled: false,
        usePhysicalMaterials: false,
        waterTransmission: false,
        terrainQualityCap: RenderQuality.Low,
        roadDeferNormals: true,
        voxelLodMultiplier: 2,
      }
    case RenderQuality.Medium:
      return {
        shadowsEnabled: true,
        shadowMapSize: ShadowMapSize.Medium,
        dpr: RenderQualityDpr.Medium,
        bloom: false,
        noise: false,
        vignette: true,
        postFxEnabled: true,
        usePhysicalMaterials: false,
        waterTransmission: false,
        terrainQualityCap: RenderQuality.Medium,
        roadDeferNormals: true,
        voxelLodMultiplier: 1.5,
      }
    case RenderQuality.High:
      return {
        shadowsEnabled: true,
        shadowMapSize: ShadowMapSize.High,
        dpr: [RenderQualityDpr.Low, RenderQualityDpr.HighMax],
        bloom: true,
        noise: true,
        vignette: true,
        postFxEnabled: true,
        usePhysicalMaterials: true,
        waterTransmission: true,
        terrainQualityCap: RenderQuality.High,
        roadDeferNormals: false,
        voxelLodMultiplier: 1,
      }
  }
}

/** Resolve GPU/CPU knobs for a preset, with temporary downgrade while interacting. */
export function resolveEffectiveRenderConfig(
  quality: RenderQuality,
  interacting: boolean
): EffectiveRenderConfig {
  const base = baseConfig(quality)
  if (!interacting) return base

  if (quality === RenderQuality.Low) {
    return { ...base, roadDeferNormals: true, voxelLodMultiplier: 2.5 }
  }

  if (quality === RenderQuality.Medium) {
    return {
      ...base,
      shadowsEnabled: false,
      shadowMapSize: ShadowMapSize.Off,
      postFxEnabled: false,
      bloom: false,
      noise: false,
      vignette: false,
      roadDeferNormals: true,
      voxelLodMultiplier: 2,
    }
  }

  return {
    ...base,
    shadowMapSize: ShadowMapSize.Medium,
    bloom: false,
    noise: false,
    vignette: false,
    postFxEnabled: false,
    roadDeferNormals: true,
    voxelLodMultiplier: 1.5,
  }
}

const TERRAIN_QUALITY_RANK: Record<TerrainQuality, number> = {
  [RenderQuality.Low]: 0,
  [RenderQuality.Medium]: 1,
  [RenderQuality.High]: 2,
}

/** Cap sculpt mesh density by the effective render preset. */
export function resolveTerrainMeshQuality(
  requested: TerrainQuality,
  cap: TerrainQuality
): TerrainQuality {
  return TERRAIN_QUALITY_RANK[requested] <= TERRAIN_QUALITY_RANK[cap] ? requested : cap
}

export function isRenderQuality(value: string): value is RenderQuality {
  return (
    value === RenderQuality.Low ||
    value === RenderQuality.Medium ||
    value === RenderQuality.High
  )
}
