import { afterEach, describe, expect, it } from 'vitest'
import {
  FEATURE_FLAG_ON,
  FeatureFlag,
  is3dCanvasEnabled,
  isFeatureEnabled,
  isLoopCreatorEnabled,
  isWorkspaceChatOverlayEnabled,
} from '../feature-flags'

const CANVAS_KEY = 'NEXT_PUBLIC_FF_3D_CANVAS'
const LOOP_KEY = 'NEXT_PUBLIC_FF_LOOP_CREATOR'
const OVERLAY_KEY = 'NEXT_PUBLIC_FF_WORKSPACE_CHAT_OVERLAY'

describe('client module nav flags', () => {
  const prevCanvas = process.env[CANVAS_KEY]
  const prevLoop = process.env[LOOP_KEY]
  const prevOverlay = process.env[OVERLAY_KEY]

  afterEach(() => {
    if (prevCanvas === undefined) Reflect.deleteProperty(process.env, CANVAS_KEY)
    else process.env[CANVAS_KEY] = prevCanvas
    if (prevLoop === undefined) Reflect.deleteProperty(process.env, LOOP_KEY)
    else process.env[LOOP_KEY] = prevLoop
    if (prevOverlay === undefined) Reflect.deleteProperty(process.env, OVERLAY_KEY)
    else process.env[OVERLAY_KEY] = prevOverlay
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

  it('hides workspace chat overlay unless NEXT_PUBLIC_FF_WORKSPACE_CHAT_OVERLAY=true', () => {
    Reflect.deleteProperty(process.env, OVERLAY_KEY)
    expect(isWorkspaceChatOverlayEnabled()).toBe(false)
    process.env[OVERLAY_KEY] = '1'
    expect(isWorkspaceChatOverlayEnabled()).toBe(false)
    process.env[OVERLAY_KEY] = FEATURE_FLAG_ON
    expect(isWorkspaceChatOverlayEnabled()).toBe(true)
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

describe('FF_STORYTELLER_EXTRA_CRITIC_SCOPES', () => {
  const key = FeatureFlag.StorytellerExtraCriticScopes
  const prev = process.env[key]

  afterEach(() => {
    if (prev === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = prev
  })

  it('is off unless set to true', () => {
    Reflect.deleteProperty(process.env, key)
    expect(isFeatureEnabled(FeatureFlag.StorytellerExtraCriticScopes)).toBe(false)
    process.env[key] = '1'
    expect(isFeatureEnabled(FeatureFlag.StorytellerExtraCriticScopes)).toBe(false)
    process.env[key] = FEATURE_FLAG_ON
    expect(isFeatureEnabled(FeatureFlag.StorytellerExtraCriticScopes)).toBe(true)
  })
})

describe('fiction-adjusted Humanizer flag', () => {
  it('is not a FeatureFlag member', () => {
    expect(Object.values(FeatureFlag)).not.toContain('FF_STORYTELLER_HUMANIZER_FICTION')
  })
})
