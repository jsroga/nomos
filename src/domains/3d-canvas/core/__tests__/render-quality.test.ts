import { describe, expect, it } from 'vitest'
import {
  resolveEffectiveRenderConfig,
  resolveTerrainMeshQuality,
  isRenderQuality,
} from '@/domains/3d-canvas/core/render-quality'
import { RenderQuality, ShadowMapSize } from '@/domains/3d-canvas/constants/render-quality'

describe('resolveEffectiveRenderConfig', () => {
  it('keeps high idle quality with 2048 shadows and full post FX', () => {
    const cfg = resolveEffectiveRenderConfig(RenderQuality.High, false)
    expect(cfg.shadowsEnabled).toBe(true)
    expect(cfg.shadowMapSize).toBe(ShadowMapSize.High)
    expect(cfg.bloom).toBe(true)
    expect(cfg.postFxEnabled).toBe(true)
  })

  it('drops post FX and shadow size while interacting on high', () => {
    const cfg = resolveEffectiveRenderConfig(RenderQuality.High, true)
    expect(cfg.shadowMapSize).toBe(ShadowMapSize.Medium)
    expect(cfg.postFxEnabled).toBe(false)
    expect(cfg.roadDeferNormals).toBe(true)
  })

  it('disables shadows on low', () => {
    const cfg = resolveEffectiveRenderConfig(RenderQuality.Low, false)
    expect(cfg.shadowsEnabled).toBe(false)
    expect(cfg.postFxEnabled).toBe(false)
    expect(cfg.usePhysicalMaterials).toBe(false)
  })
})

describe('resolveTerrainMeshQuality', () => {
  it('caps requested quality to the render preset', () => {
    expect(resolveTerrainMeshQuality('high', 'low')).toBe('low')
    expect(resolveTerrainMeshQuality('medium', 'high')).toBe('medium')
  })
})

describe('isRenderQuality', () => {
  it('accepts known presets only', () => {
    expect(isRenderQuality('high')).toBe(true)
    expect(isRenderQuality('ultra')).toBe(false)
  })
})
