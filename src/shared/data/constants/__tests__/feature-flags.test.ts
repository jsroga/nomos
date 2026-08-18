import { afterEach, describe, expect, it } from 'vitest'
import {
  FEATURE_FLAG_ON,
  FeatureFlag,
  is3dCanvasEnabled,
  isFeatureEnabled,
  isLoopCreatorEnabled,
} from '../feature-flags'

const CANVAS_KEY = 'NEXT_PUBLIC_FF_3D_CANVAS'
const LOOP_KEY = 'NEXT_PUBLIC_FF_LOOP_CREATOR'

describe('client module nav flags', () => {
  const prevCanvas = process.env[CANVAS_KEY]
  const prevLoop = process.env[LOOP_KEY]

  afterEach(() => {
    if (prevCanvas === undefined) Reflect.deleteProperty(process.env, CANVAS_KEY)
    else process.env[CANVAS_KEY] = prevCanvas
    if (prevLoop === undefined) Reflect.deleteProperty(process.env, LOOP_KEY)
    else process.env[LOOP_KEY] = prevLoop
  })

  it('hides 3d-canvas unless NEXT_PUBLIC_FF_3D_CANVAS=true', () => {
    Reflect.deleteProperty(process.env, CANVAS_KEY)
    expect(is3dCanvasEnabled()).toBe(false)
    process.env[CANVAS_KEY] = '1'
    expect(is3dCanvasEnabled()).toBe(false)
    process.env[CANVAS_KEY] = FEATURE_FLAG_ON
    expect(is3dCanvasEnabled()).toBe(true)
  })

  it('hides loop-creator unless NEXT_PUBLIC_FF_LOOP_CREATOR=true', () => {
    Reflect.deleteProperty(process.env, LOOP_KEY)
    expect(isLoopCreatorEnabled()).toBe(false)
    process.env[LOOP_KEY] = '1'
    expect(isLoopCreatorEnabled()).toBe(false)
    process.env[LOOP_KEY] = FEATURE_FLAG_ON
    expect(isLoopCreatorEnabled()).toBe(true)
  })
})

describe('FF_TILE_SEAM_COLOR_FADE', () => {
  const key = FeatureFlag.TileSeamColorFade
  const prev = process.env[key]

  afterEach(() => {
    if (prev === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = prev
  })

  it('is off unless set to true', () => {
    Reflect.deleteProperty(process.env, key)
    expect(isFeatureEnabled(FeatureFlag.TileSeamColorFade)).toBe(false)
    process.env[key] = '1'
    expect(isFeatureEnabled(FeatureFlag.TileSeamColorFade)).toBe(false)
    process.env[key] = FEATURE_FLAG_ON
    expect(isFeatureEnabled(FeatureFlag.TileSeamColorFade)).toBe(true)
  })
})
