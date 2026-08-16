import { describe, expect, it } from 'vitest'
import {
  packedCanvasLayout,
  tightPackedCanvasLayout,
  packedAspectRatio,
  isApiframeGenerateAspectRatio,
  scaleCropRect,
  PACKED_TILE_SIZE,
  type CardinalPresence,
} from '../context-pack-layout'
import { ApiframeGenerateAspectRatio } from '../constants/apiframe'

function presenceFromMask(mask: number): CardinalPresence {
  return {
    left: (mask & 1) !== 0,
    right: (mask & 2) !== 0,
    up: (mask & 4) !== 0,
    down: (mask & 8) !== 0,
  }
}

const COMBOS: Array<{ mask: number; presence: CardinalPresence }> = Array.from(
  { length: 16 },
  (_, mask) => ({ mask, presence: presenceFromMask(mask) }),
)

const LEFT_ONLY: CardinalPresence = {
  left: true,
  right: false,
  up: false,
  down: false,
}

describe('tightPackedCanvasLayout', () => {
  it.each(COMBOS)('sizes the canvas from cardinal flags ($mask)', ({ presence }) => {
    const layout = tightPackedCanvasLayout(presence)
    const left = presence.left ? 1 : 0
    const right = presence.right ? 1 : 0
    const up = presence.up ? 1 : 0
    const down = presence.down ? 1 : 0
    expect(layout.width).toBe(PACKED_TILE_SIZE + PACKED_TILE_SIZE * (left + right))
    expect(layout.height).toBe(PACKED_TILE_SIZE + PACKED_TILE_SIZE * (up + down))
    expect(layout.hole.width).toBe(PACKED_TILE_SIZE)
    expect(layout.hole.height).toBe(PACKED_TILE_SIZE)
    expect(layout.hole.x).toBe(presence.left ? PACKED_TILE_SIZE : 0)
    expect(layout.hole.y).toBe(presence.up ? PACKED_TILE_SIZE : 0)
  })

  it('does not place the left-only hole at the bitmap center', () => {
    const layout = tightPackedCanvasLayout(LEFT_ONLY)
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(512)
    expect(layout.hole.x).toBe(512)
    expect(layout.hole.x).not.toBe((layout.width - layout.hole.width) / 2)
  })
})

describe('packedCanvasLayout Apiframe aspect', () => {
  it.each(COMBOS)('sent aspect is on the Grok allowlist ($mask)', ({ presence }) => {
    const layout = packedCanvasLayout(presence)
    const aspect = packedAspectRatio(layout.width, layout.height)
    expect(isApiframeGenerateAspectRatio(aspect)).toBe(true)
  })

  it('pads 2:1 left-only into 16:9 with a thin letterbox, not a 1:1 square', () => {
    const tight = tightPackedCanvasLayout(LEFT_ONLY)
    const sent = packedCanvasLayout(LEFT_ONLY)
    expect(packedAspectRatio(tight.width, tight.height)).toBe(
      ApiframeGenerateAspectRatio.Widescreen,
    )
    expect(sent.width).toBe(1024)
    expect(sent.height).toBe(576)
    expect(sent.hole.x).toBe(tight.hole.x)
    expect(sent.hole.y).toBe(32)
    expect(sent.hole.x).not.toBe((sent.width - sent.hole.width) / 2)
    expect(packedAspectRatio(sent.width, sent.height)).toBe(
      ApiframeGenerateAspectRatio.Widescreen,
    )
  })

  it('pads 1:2 down-only into 9:16 with a thin letterbox', () => {
    const presence = { left: false, right: false, up: false, down: true }
    const tight = tightPackedCanvasLayout(presence)
    const sent = packedCanvasLayout(presence)
    expect(tight.width).toBe(512)
    expect(tight.height).toBe(1024)
    expect(sent.width).toBe(576)
    expect(sent.height).toBe(1024)
    expect(sent.hole.x).toBe(32)
    expect(sent.hole.y).toBe(tight.hole.y)
    expect(packedAspectRatio(sent.width, sent.height)).toBe(
      ApiframeGenerateAspectRatio.TallNineSixteen,
    )
  })

  it('does not emit gcd ratios Grok rejects', () => {
    expect(packedAspectRatio(1024, 512)).not.toBe('2:1')
    expect(packedAspectRatio(512, 1024)).not.toBe('1:2')
    expect(packedAspectRatio(1536, 512)).not.toBe('3:1')
  })

  it('keeps 3:2 packs on 3:2 with no letterbox', () => {
    const presence = { left: true, right: true, up: true, down: false }
    const tight = tightPackedCanvasLayout(presence)
    const sent = packedCanvasLayout(presence)
    expect(tight.width).toBe(1536)
    expect(tight.height).toBe(1024)
    expect(sent.width).toBe(tight.width)
    expect(sent.height).toBe(tight.height)
    expect(packedAspectRatio(sent.width, sent.height)).toBe(
      ApiframeGenerateAspectRatio.LandscapeThreeTwo,
    )
  })
})

describe('scaleCropRect', () => {
  it('scales a matching-aspect output uniformly', () => {
    const hole = { x: 512, y: 32, width: 512, height: 512 }
    expect(scaleCropRect(hole, 1024, 576, 2048, 1152)).toEqual({
      x: 1024,
      y: 64,
      width: 1024,
      height: 1024,
    })
  })

  it('contain-fits a 16:9 pack into a 1:1 output instead of stretching Y', () => {
    const hole = { x: 512, y: 32, width: 512, height: 512 }
    expect(scaleCropRect(hole, 1024, 576, 1024, 1024)).toEqual({
      x: 512,
      y: 256,
      width: 512,
      height: 512,
    })
  })
})
