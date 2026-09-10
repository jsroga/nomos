import sharp from 'sharp'
import { TILE_CROP_SIZE } from './generate-tile'

const RGBA_CHANNELS = 4
const WHITE_MIN = 245
const FULL_COVERAGE_RATIO = 0.92

function isNearWhite(r: number, g: number, b: number): boolean {
  return r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN
}

function markEmptyFromCorners(data: Buffer, width: number, height: number): Uint8Array {
  const empty = new Uint8Array(width * height)
  const stack: number[] = []

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (empty[i] === 1) return
    const offset = i * RGBA_CHANNELS
    if (!isNearWhite(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0)) return
    empty[i] = 1
    stack.push(i)
  }

  tryPush(0, 0)
  tryPush(width - 1, 0)
  tryPush(0, height - 1)
  tryPush(width - 1, height - 1)

  while (stack.length > 0) {
    const i = stack.pop() ?? 0
    const x = i % width
    const y = Math.floor(i / width)
    tryPush(x - 1, y)
    tryPush(x + 1, y)
    tryPush(x, y - 1)
    tryPush(x, y + 1)
  }

  return empty
}

function contentBoundingBox(
  empty: Uint8Array,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number; coverage: number } | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let content = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (empty[y * width + x] === 1) continue
      content += 1
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0 || maxY < 0) return null
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    coverage: content / (width * height),
  }
}

/** Crop near-white corner triangles and cover-resize so the scene fills the square. */
export async function fillWhiteCornerTriangles(tile: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(tile)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const width = info.width
  const height = info.height
  const empty = markEmptyFromCorners(data, width, height)
  const bbox = contentBoundingBox(empty, width, height)
  if (!bbox || bbox.coverage >= FULL_COVERAGE_RATIO) {
    return sharp(data, { raw: { width, height, channels: RGBA_CHANNELS } })
      .png()
      .toBuffer()
  }
  return sharp(data, { raw: { width, height, channels: RGBA_CHANNELS } })
    .extract({ left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height })
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .png()
    .toBuffer()
}
