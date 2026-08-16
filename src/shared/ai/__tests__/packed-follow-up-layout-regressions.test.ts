import { describe, expect, it } from 'vitest'
import {
  cardinalCount,
  isApiframeGenerateAspectRatio,
  packedAspectRatio,
  packedCanvasLayout,
  packedCropSpecFromLayout,
  PACKED_TILE_SIZE,
  scaleCropRect,
  tightPackedCanvasLayout,
  type CardinalPresence,
  type PackedCropRect,
} from '../context-pack-layout'
import { ApiframeGenerateAspectRatio } from '../constants/apiframe'

const TILE = PACKED_TILE_SIZE

function presence(
  left: boolean,
  right: boolean,
  up: boolean,
  down: boolean,
): CardinalPresence {
  return { left, right, up, down }
}

const TIGHT: Array<{
  name: string
  flags: CardinalPresence
  width: number
  height: number
  holeX: number
  holeY: number
}> = [
  { name: 'empty', flags: presence(false, false, false, false), width: 512, height: 512, holeX: 0, holeY: 0 },
  { name: 'left-only', flags: presence(true, false, false, false), width: 1024, height: 512, holeX: 512, holeY: 0 },
  { name: 'right-only', flags: presence(false, true, false, false), width: 1024, height: 512, holeX: 0, holeY: 0 },
  { name: 'up-only', flags: presence(false, false, true, false), width: 512, height: 1024, holeX: 0, holeY: 512 },
  { name: 'down-only', flags: presence(false, false, false, true), width: 512, height: 1024, holeX: 0, holeY: 0 },
  { name: 'left+right', flags: presence(true, true, false, false), width: 1536, height: 512, holeX: 512, holeY: 0 },
  { name: 'up+down', flags: presence(false, false, true, true), width: 512, height: 1536, holeX: 0, holeY: 512 },
  { name: 'left+up', flags: presence(true, false, true, false), width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: 'right+down', flags: presence(false, true, false, true), width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: 'left+down', flags: presence(true, false, false, true), width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: 'right+up', flags: presence(false, true, true, false), width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: 'left+right+up', flags: presence(true, true, true, false), width: 1536, height: 1024, holeX: 512, holeY: 512 },
  { name: 'all-cardinals', flags: presence(true, true, true, true), width: 1536, height: 1536, holeX: 512, holeY: 512 },
]

describe('tightPackedCanvasLayout follow-up holes', () => {
  it.each(TIGHT)('$name is $width×$height with hole at ($holeX,$holeY)', ({
    flags,
    width,
    height,
    holeX,
    holeY,
  }) => {
    const layout = tightPackedCanvasLayout(flags)
    expect(layout.width).toBe(width)
    expect(layout.height).toBe(height)
    expect(layout.hole).toEqual({ x: holeX, y: holeY, width: TILE, height: TILE })
    if (flags.left) expect(layout.left).toEqual({ x: 0, y: holeY })
    else expect(layout.left).toBeUndefined()
    if (flags.right) expect(layout.right).toEqual({ x: holeX + TILE, y: holeY })
    else expect(layout.right).toBeUndefined()
    if (flags.up) expect(layout.up).toEqual({ x: holeX, y: 0 })
    else expect(layout.up).toBeUndefined()
    if (flags.down) expect(layout.down).toEqual({ x: holeX, y: holeY + TILE })
    else expect(layout.down).toBeUndefined()
  })

  it.each([
    presence(true, false, false, false),
    presence(false, true, false, false),
    presence(false, false, true, false),
    presence(false, false, false, true),
  ])('single-neighbor pack hole is not the bitmap center %#', flags => {
    const layout = tightPackedCanvasLayout(flags)
    const centerX = (layout.width - layout.hole.width) / 2
    const centerY = (layout.height - layout.hole.height) / 2
    expect(layout.hole.x === centerX && layout.hole.y === centerY).toBe(false)
  })
})

describe('packedCanvasLayout never square-pads 2:1 or 1:2', () => {
  it.each([
    {
      name: 'left-only',
      flags: presence(true, false, false, false),
      width: 1024,
      height: 576,
      holeX: 512,
      holeY: 32,
      aspect: ApiframeGenerateAspectRatio.Widescreen,
    },
    {
      name: 'right-only',
      flags: presence(false, true, false, false),
      width: 1024,
      height: 576,
      holeX: 0,
      holeY: 32,
      aspect: ApiframeGenerateAspectRatio.Widescreen,
    },
    {
      name: 'up-only',
      flags: presence(false, false, true, false),
      width: 576,
      height: 1024,
      holeX: 32,
      holeY: 512,
      aspect: ApiframeGenerateAspectRatio.TallNineSixteen,
    },
    {
      name: 'down-only',
      flags: presence(false, false, false, true),
      width: 576,
      height: 1024,
      holeX: 32,
      holeY: 0,
      aspect: ApiframeGenerateAspectRatio.TallNineSixteen,
    },
    {
      name: 'left+right 3:1',
      flags: presence(true, true, false, false),
      width: 1536,
      height: 864,
      holeX: 512,
      holeY: 176,
      aspect: ApiframeGenerateAspectRatio.Widescreen,
    },
    {
      name: 'up+down 1:3',
      flags: presence(false, false, true, true),
      width: 864,
      height: 1536,
      holeX: 176,
      holeY: 512,
      aspect: ApiframeGenerateAspectRatio.TallNineSixteen,
    },
  ])('$name pads to $width×$height ($aspect), not 1:1', ({
    flags,
    width,
    height,
    holeX,
    holeY,
    aspect,
  }) => {
    const sent = packedCanvasLayout(flags)
    expect(sent.width).toBe(width)
    expect(sent.height).toBe(height)
    expect(sent.hole.x).toBe(holeX)
    expect(sent.hole.y).toBe(holeY)
    expect(sent.width === sent.height).toBe(false)
    expect(sent.hole.y).not.toBe(256)
    expect(packedAspectRatio(sent.width, sent.height)).toBe(aspect)
  })

  it.each([
    {
      name: 'first-tile square',
      flags: presence(false, false, false, false),
      aspect: ApiframeGenerateAspectRatio.Square,
    },
    {
      name: '3:2 left+right+up',
      flags: presence(true, true, true, false),
      aspect: ApiframeGenerateAspectRatio.LandscapeThreeTwo,
    },
    {
      name: '2:3 left+up+down',
      flags: presence(true, false, true, true),
      aspect: ApiframeGenerateAspectRatio.PortraitTwoThree,
    },
  ])('$name stays on $aspect with no letterbox', ({ flags, aspect }) => {
    const tight = tightPackedCanvasLayout(flags)
    const sent = packedCanvasLayout(flags)
    expect(sent.width).toBe(tight.width)
    expect(sent.height).toBe(tight.height)
    expect(sent.hole).toEqual(tight.hole)
    expect(packedAspectRatio(sent.width, sent.height)).toBe(aspect)
  })
})

describe('packedAspectRatio Grok allowlist', () => {
  it.each([
    [1024, 512, ApiframeGenerateAspectRatio.Widescreen],
    [512, 1024, ApiframeGenerateAspectRatio.TallNineSixteen],
    [1536, 512, ApiframeGenerateAspectRatio.Widescreen],
    [512, 1536, ApiframeGenerateAspectRatio.TallNineSixteen],
    [1024, 1024, ApiframeGenerateAspectRatio.Square],
    [1536, 1024, ApiframeGenerateAspectRatio.LandscapeThreeTwo],
    [1024, 1536, ApiframeGenerateAspectRatio.PortraitTwoThree],
    [1024, 576, ApiframeGenerateAspectRatio.Widescreen],
    [576, 1024, ApiframeGenerateAspectRatio.TallNineSixteen],
    [0, 100, ApiframeGenerateAspectRatio.Square],
    [100, 0, ApiframeGenerateAspectRatio.Square],
    [-8, 512, ApiframeGenerateAspectRatio.Square],
  ] as const)('%i×%i snaps to %s, never 2:1/1:2', (width, height, aspect) => {
    expect(packedAspectRatio(width, height)).toBe(aspect)
    expect(packedAspectRatio(width, height)).not.toBe('2:1')
    expect(packedAspectRatio(width, height)).not.toBe('1:2')
  })

  it.each([
    ['2:1', false],
    ['1:2', false],
    ['3:1', false],
    ['4:3', false],
    [ApiframeGenerateAspectRatio.Widescreen, true],
    [ApiframeGenerateAspectRatio.Square, true],
    [ApiframeGenerateAspectRatio.TallNineSixteen, true],
    [ApiframeGenerateAspectRatio.LandscapeThreeTwo, true],
    [ApiframeGenerateAspectRatio.PortraitTwoThree, true],
  ] as const)('allowlist membership %s → %s', (value, allowed) => {
    expect(isApiframeGenerateAspectRatio(value)).toBe(allowed)
  })
})

describe('scaleCropRect uniform contain-fit', () => {
  const leftHole: PackedCropRect = { x: 512, y: 0, width: TILE, height: TILE }
  const wideHole: PackedCropRect = { x: 512, y: 32, width: TILE, height: TILE }
  const tallHole: PackedCropRect = { x: 32, y: 512, width: TILE, height: TILE }

  it.each([
    {
      name: 'identity left-only',
      crop: leftHole,
      packedW: 1024,
      packedH: 512,
      outW: 1024,
      outH: 512,
      expected: { x: 512, y: 0, width: 512, height: 512 },
    },
    {
      name: '2× 16:9 letterbox',
      crop: wideHole,
      packedW: 1024,
      packedH: 576,
      outW: 2048,
      outH: 1152,
      expected: { x: 1024, y: 64, width: 1024, height: 1024 },
    },
    {
      name: '2:1 into 1:1 keeps hole 512 tall (stretch would be 1024)',
      crop: leftHole,
      packedW: 1024,
      packedH: 512,
      outW: 1024,
      outH: 1024,
      expected: { x: 512, y: 256, width: 512, height: 512 },
    },
    {
      name: '16:9 pack into 1:1 output',
      crop: wideHole,
      packedW: 1024,
      packedH: 576,
      outW: 1024,
      outH: 1024,
      expected: { x: 512, y: 256, width: 512, height: 512 },
    },
    {
      name: '9:16 pack into 1:1 output',
      crop: tallHole,
      packedW: 576,
      packedH: 1024,
      outW: 1024,
      outH: 1024,
      expected: { x: 256, y: 512, width: 512, height: 512 },
    },
    {
      name: '1:2 into 1:1 keeps hole 512 wide',
      crop: { x: 0, y: 0, width: TILE, height: TILE },
      packedW: 512,
      packedH: 1024,
      outW: 1024,
      outH: 1024,
      expected: { x: 256, y: 0, width: 512, height: 512 },
    },
    {
      name: '3× matching square',
      crop: { x: 0, y: 0, width: TILE, height: TILE },
      packedW: 512,
      packedH: 512,
      outW: 1536,
      outH: 1536,
      expected: { x: 0, y: 0, width: 1536, height: 1536 },
    },
    {
      name: 'zero packed size does not throw',
      crop: leftHole,
      packedW: 0,
      packedH: 0,
      outW: 512,
      outH: 512,
      expected: { x: 511, y: 0, width: 1, height: 512 },
    },
  ])('$name', ({ crop, packedW, packedH, outW, outH, expected }) => {
    expect(scaleCropRect(crop, packedW, packedH, outW, outH)).toEqual(expected)
  })

  it('does not stretch hole height when Grok returns a square of a 2:1 pack', () => {
    const mapped = scaleCropRect(leftHole, 1024, 512, 1024, 1024)
    expect(mapped.height).toBe(TILE)
    expect(mapped.height).not.toBe(1024)
    expect(mapped.y).toBe(256)
    expect(mapped.y).not.toBe(0)
  })
})

describe('packedCropSpecFromLayout and cardinalCount', () => {
  it('copies hole and canvas size into the crop spec', () => {
    const layout = packedCanvasLayout(presence(true, false, false, false))
    expect(packedCropSpecFromLayout(layout)).toEqual({
      cropRect: layout.hole,
      packedWidth: layout.width,
      packedHeight: layout.height,
    })
  })

  it.each([
    [presence(false, false, false, false), 0],
    [presence(true, false, false, false), 1],
    [presence(true, true, false, false), 2],
    [presence(true, true, true, false), 3],
    [presence(true, true, true, true), 4],
  ] as const)('cardinalCount %#', (flags, count) => {
    expect(cardinalCount(flags)).toBe(count)
  })
})
