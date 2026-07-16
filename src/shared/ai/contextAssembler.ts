/**
 * Context Assembler
 *
 * Composes a 1024×1024 context canvas from neighboring tiles for outpainting.
 * All heavy work (image fetch, decode, canvas draw) runs inside a Web Worker
 * using OffscreenCanvas so the main thread stays responsive.
 *
 * Falls back to the main-thread implementation if workers are not supported.
 */
import { TileContext } from './types'

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

const NEUTRAL_FILL_RGB = { r: 128, g: 128, b: 128 }
const NEUTRAL_FILL_TOLERANCE = 2

type DirectNeighborKey = 'up' | 'down' | 'left' | 'right'

const DIRECT_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['up', 'down', 'left', 'right']
const HORIZONTAL_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['left', 'right']
const VERTICAL_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['up', 'down']
const CANVAS_2D_UNAVAILABLE = 'Failed to acquire 2D canvas context'

export type ContextImageVariant = 'canonicalFullContext' | 'smartSeamContext'

export interface ContextFramingStrategy {
  mode: 'balanced' | 'horizontal_priority' | 'vertical_priority'
  weightedNeighbors: DirectNeighborKey[]
}

export interface AssembleContextImageResult {
  imageBlob: Blob
  maskBlob: Blob
  cropRect: CropRect
  directNeighborCount: number
  variant: ContextImageVariant
  strategy: ContextFramingStrategy
}

// ---------------------------------------------------------------------------
// Worker singleton
// ---------------------------------------------------------------------------

let _worker: Worker | null = null
let _workerSupported: boolean | null = null

function getWorker(): Worker | null {
  if (_workerSupported === false) return null
  if (_worker) return _worker

  try {
    _worker = new Worker(new URL('./contextAssemblerWorker', import.meta.url))
    _workerSupported = true
    _worker.onerror = e => {
      console.error('[contextAssembler] Worker error:', e)
    }
    return _worker
  } catch {
    console.warn('[contextAssembler] Web Worker not available, falling back to main thread')
    _workerSupported = false
    return null
  }
}

let _nextId = 0

/** Resolve a possibly-relative image URL to an absolute URL the worker can fetch. */
function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${window.location.origin}${path}`
}

function extractNeighborUrls(context: TileContext): Record<string, string | undefined> {
  const { up, down, left, right, topLeft, topRight, bottomLeft, bottomRight } = context.neighbors
  const resolve = (t: (typeof up) | undefined) => {
    const raw = t?.imageUrl ?? (t?.image_filename
      ? t.image_filename.startsWith('http')
        ? t.image_filename
        : t.image_filename  // caller should have already resolved, but handle gracefully
      : undefined)
    return raw ? toAbsoluteUrl(raw) : undefined
  }
  return {
    up: resolve(up),
    down: resolve(down),
    left: resolve(left),
    right: resolve(right),
    topLeft: resolve(topLeft),
    topRight: resolve(topRight),
    bottomLeft: resolve(bottomLeft),
    bottomRight: resolve(bottomRight),
  }
}

function getDirectNeighborPresence(neighborUrls: Record<string, string | undefined>) {
  return {
    up: !!neighborUrls.up,
    down: !!neighborUrls.down,
    left: !!neighborUrls.left,
    right: !!neighborUrls.right,
  }
}

function getContextFramingStrategy(
  variant: ContextImageVariant,
  directNeighbors: Record<DirectNeighborKey, boolean>
): ContextFramingStrategy {
  if (variant === 'canonicalFullContext') {
    return {
      mode: 'balanced',
      weightedNeighbors: DIRECT_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  const hasHorizontal = directNeighbors.left || directNeighbors.right
  const hasVertical = directNeighbors.up || directNeighbors.down

  if (hasHorizontal && !hasVertical) {
    return {
      mode: 'horizontal_priority',
      weightedNeighbors: HORIZONTAL_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  if (hasVertical && !hasHorizontal) {
    return {
      mode: 'vertical_priority',
      weightedNeighbors: VERTICAL_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  return {
    mode: 'balanced',
    weightedNeighbors: DIRECT_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
  }
}

// ---------------------------------------------------------------------------
// Worker path
// ---------------------------------------------------------------------------

function assembleViaWorker(
  worker: Worker,
  neighborUrls: Record<string, string | undefined>,
  size: number,
  variant: ContextImageVariant
): Promise<AssembleContextImageResult> {
  return new Promise((resolve, reject) => {
    const id = ++_nextId

    const onMessage = (event: MessageEvent) => {
      if (event.data.id !== id) return
      worker.removeEventListener('message', onMessage)
      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve({
          imageBlob: event.data.imageBlob,
          maskBlob: event.data.maskBlob,
          cropRect: event.data.cropRect,
          directNeighborCount: event.data.directNeighborCount ?? 0,
          variant: event.data.variant ?? variant,
          strategy: event.data.strategy ?? getContextFramingStrategy(variant, getDirectNeighborPresence(neighborUrls)),
        })
      }
    }

    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, size, neighborUrls, variant })
  })
}

// ---------------------------------------------------------------------------
// Main-thread fallback (preserved verbatim for reliability)
// ---------------------------------------------------------------------------

const TILE_SIZE = 512
const CONTEXT_SIZE = 256

type NeighborCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
type NeighborEdge = 'top' | 'bottom' | 'left' | 'right'
type NeighborDirection = 'up' | 'down' | 'left' | 'right'
interface ScaledCrop {
  x: number
  y: number
  w: number
  h: number
}

function getScaledCornerCrop(img: HTMLImageElement, corner: NeighborCorner): ScaledCrop {
  const ratio = CONTEXT_SIZE / TILE_SIZE
  const { width: w, height: h } = img
  switch (corner) {
    case 'topLeft':
      return { x: 0, y: 0, w: w * ratio, h: h * ratio }
    case 'topRight':
      return { x: w * (1 - ratio), y: 0, w: w * ratio, h: h * ratio }
    case 'bottomLeft':
      return { x: 0, y: h * (1 - ratio), w: w * ratio, h: h * ratio }
    case 'bottomRight':
      return { x: w * (1 - ratio), y: h * (1 - ratio), w: w * ratio, h: h * ratio }
  }
}

function getScaledEdgeCrop(img: HTMLImageElement, edge: NeighborEdge): ScaledCrop {
  const ratio = CONTEXT_SIZE / TILE_SIZE
  const { width: w, height: h } = img
  switch (edge) {
    case 'top':
      return { x: 0, y: 0, w, h: h * ratio }
    case 'bottom':
      return { x: 0, y: h * (1 - ratio), w, h: h * ratio }
    case 'left':
      return { x: 0, y: 0, w: w * ratio, h }
    case 'right':
      return { x: w * (1 - ratio), y: 0, w: w * ratio, h }
  }
}

type SeamNeighbor = TileContext['neighbors']['up']
type DrawSmartCorner = (
  neighbor: SeamNeighbor,
  edge: NeighborEdge,
  sourceHalf: 'start' | 'end',
  destX: number,
  destY: number
) => Promise<void>

/**
 * Fill the diagonal corners of a seam from the priority edges when the true
 * corner tile is absent (smartSeamContext only). Extracted from the main
 * assembler so its two mode branches don't inflate that function's complexity.
 */
async function applySmartSeamCorners(params: {
  mode: ContextFramingStrategy['mode']
  draw: DrawSmartCorner
  corners: Record<NeighborCorner, SeamNeighbor>
  edges: Record<NeighborDirection, SeamNeighbor>
  targetX: number
  targetY: number
}): Promise<void> {
  const { mode, draw, corners, edges, targetX, targetY } = params
  const farX = targetX + TILE_SIZE
  const farY = targetY + TILE_SIZE

  if (mode === 'horizontal_priority') {
    if (!corners.topLeft?.imageUrl) await draw(edges.left, 'right', 'start', 0, 0)
    if (!corners.bottomLeft?.imageUrl) await draw(edges.left, 'right', 'end', 0, farY)
    if (!corners.topRight?.imageUrl) await draw(edges.right, 'left', 'start', farX, 0)
    if (!corners.bottomRight?.imageUrl) await draw(edges.right, 'left', 'end', farX, farY)
  }

  if (mode === 'vertical_priority') {
    if (!corners.topLeft?.imageUrl) await draw(edges.up, 'bottom', 'start', 0, 0)
    if (!corners.topRight?.imageUrl) await draw(edges.up, 'bottom', 'end', farX, 0)
    if (!corners.bottomLeft?.imageUrl) await draw(edges.down, 'top', 'start', 0, farY)
    if (!corners.bottomRight?.imageUrl) await draw(edges.down, 'top', 'end', farX, farY)
  }
}

async function assembleOnMainThread(
  context: TileContext,
  size: number,
  variant: ContextImageVariant
): Promise<AssembleContextImageResult> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const TARGET_X = (size - TILE_SIZE) / 2
  const TARGET_Y = (size - TILE_SIZE) / 2

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      if (src.startsWith('data:') && !src.startsWith('data:image/')) {
        reject(new Error('Cannot load non-image data URI'))
        return
      }
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  const { up, down, left, right, topLeft, topRight, bottomLeft, bottomRight } = context.neighbors
  let directNeighborCount = 0
  const directNeighbors = {
    up: !!up?.imageUrl,
    down: !!down?.imageUrl,
    left: !!left?.imageUrl,
    right: !!right?.imageUrl,
  }
  const strategy = getContextFramingStrategy(variant, directNeighbors)

  const drawCorner = async (
    neighbor: typeof up,
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
    destX: number,
    destY: number
  ) => {
    if (!neighbor?.imageUrl) return
    try {
      const img = await loadImage(neighbor.imageUrl)
      const src = getScaledCornerCrop(img, corner)
      ctx.drawImage(img, src.x, src.y, src.w, src.h, destX, destY, CONTEXT_SIZE, CONTEXT_SIZE)
    } catch { }
  }

  const drawEdge = async (
    neighbor: typeof up,
    edge: 'top' | 'bottom' | 'left' | 'right',
    destX: number,
    destY: number,
    destW: number,
    destH: number
  ) => {
    if (!neighbor?.imageUrl) return
    try {
      const img = await loadImage(neighbor.imageUrl)
      const src = getScaledEdgeCrop(img, edge)
      ctx.drawImage(img, src.x, src.y, src.w, src.h, destX, destY, destW, destH)
      directNeighborCount++
    } catch { }
  }

  await drawCorner(topLeft, 'bottomRight', 0, 0)
  await drawCorner(topRight, 'bottomLeft', TARGET_X + TILE_SIZE, 0)
  await drawCorner(bottomLeft, 'topRight', 0, TARGET_Y + TILE_SIZE)
  await drawCorner(bottomRight, 'topLeft', TARGET_X + TILE_SIZE, TARGET_Y + TILE_SIZE)
  await drawEdge(up, 'bottom', TARGET_X, 0, TILE_SIZE, CONTEXT_SIZE)
  await drawEdge(down, 'top', TARGET_X, TARGET_Y + TILE_SIZE, TILE_SIZE, CONTEXT_SIZE)
  await drawEdge(left, 'right', 0, TARGET_Y, CONTEXT_SIZE, TILE_SIZE)
  await drawEdge(right, 'left', TARGET_X + TILE_SIZE, TARGET_Y, CONTEXT_SIZE, TILE_SIZE)

  const drawSmartCornerFromEdge = async (
    neighbor: typeof up,
    edge: 'top' | 'bottom' | 'left' | 'right',
    sourceHalf: 'start' | 'end',
    destX: number,
    destY: number
  ) => {
    if (!neighbor?.imageUrl || variant !== 'smartSeamContext') return
    try {
      const img = await loadImage(neighbor.imageUrl)
      const edgeSrc = getScaledEdgeCrop(img, edge)
      const useVerticalHalf = edge === 'left' || edge === 'right'
      const src = useVerticalHalf
        ? {
            x: edgeSrc.x,
            y: sourceHalf === 'start' ? edgeSrc.y : edgeSrc.y + edgeSrc.h / 2,
            w: edgeSrc.w,
            h: edgeSrc.h / 2,
          }
        : {
            x: sourceHalf === 'start' ? edgeSrc.x : edgeSrc.x + edgeSrc.w / 2,
            y: edgeSrc.y,
            w: edgeSrc.w / 2,
            h: edgeSrc.h,
          }
      ctx.drawImage(img, src.x, src.y, src.w, src.h, destX, destY, CONTEXT_SIZE, CONTEXT_SIZE)
    } catch {}
  }

  await applySmartSeamCorners({
    mode: strategy.mode,
    draw: drawSmartCornerFromEdge,
    corners: { topLeft, topRight, bottomLeft, bottomRight },
    edges: { up, down, left, right },
    targetX: TARGET_X,
    targetY: TARGET_Y,
  })

  // In masked flows the center should stay visually neutral; the mask defines the edit area.
  ctx.fillStyle = '#808080'
  ctx.fillRect(TARGET_X, TARGET_Y, TILE_SIZE, TILE_SIZE)

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = size
  maskCanvas.height = size
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error(CANVAS_2D_UNAVAILABLE)
  const imageData = ctx.getImageData(0, 0, size, size)
  const maskImageData = maskCtx.createImageData(size, size)
  const source = imageData.data
  const target = maskImageData.data

  for (let i = 0; i < source.length; i += 4) {
    const r = source[i]
    const g = source[i + 1]
    const b = source[i + 2]
    const a = source[i + 3]
    const isNeutralEditableRegion =
      a > 0 &&
      Math.abs(r - NEUTRAL_FILL_RGB.r) <= NEUTRAL_FILL_TOLERANCE &&
      Math.abs(g - NEUTRAL_FILL_RGB.g) <= NEUTRAL_FILL_TOLERANCE &&
      Math.abs(b - NEUTRAL_FILL_RGB.b) <= NEUTRAL_FILL_TOLERANCE

    const value = isNeutralEditableRegion ? 255 : 0
    target[i] = value
    target[i + 1] = value
    target[i + 2] = value
    target[i + 3] = 255
  }

  maskCtx.putImageData(maskImageData, 0, 0)

  const imageBlob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas.toBlob returned null'))), 'image/png')
  )
  const maskBlob = await new Promise<Blob>((res, rej) =>
    maskCanvas.toBlob(b => (b ? res(b) : rej(new Error('canvas.toBlob returned null'))), 'image/png')
  )

  return {
    imageBlob,
    maskBlob,
    cropRect: { x: TARGET_X, y: TARGET_Y, width: TILE_SIZE, height: TILE_SIZE },
    directNeighborCount,
    variant,
    strategy,
  }
}

// ---------------------------------------------------------------------------
// Public API (unchanged signature)
// ---------------------------------------------------------------------------

export async function assembleContextImage(
  context: TileContext,
  size: number = 1024,
  variant: ContextImageVariant = 'canonicalFullContext'
): Promise<AssembleContextImageResult> {
  const worker = typeof window !== 'undefined' ? getWorker() : null

  if (worker) {
    const neighborUrls = extractNeighborUrls(context)
    try {
      return await assembleViaWorker(worker, neighborUrls, size, variant)
    } catch (err) {
      console.warn('[contextAssembler] Worker failed, falling back to main thread:', err)
      // fall through to main thread
    }
  }

  return assembleOnMainThread(context, size, variant)
}
