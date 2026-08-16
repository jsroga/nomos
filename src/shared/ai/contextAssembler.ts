/**
 * Context Assembler
 *
 * Packs full 512 cardinal neighbors around a grey target hole on a tight canvas.
 * Heavy work runs in a Web Worker; main thread is the fallback.
 */
import { resolveContextFramingStrategy } from './contextAssembler-framing-strategy'
import {
  packedCanvasLayout,
  packedCropSpecFromLayout,
  cardinalCount,
  PACKED_CANVAS_CSS,
  PACKED_HOLE_CSS,
  type CardinalPresence,
  type PackedCropRect,
} from './context-pack-layout'
import { TileContext } from './types'

const CANVAS_2D_UNAVAILABLE = 'Failed to acquire 2D canvas context'

type DirectNeighborKey = 'up' | 'down' | 'left' | 'right'

export type ContextImageVariant = 'canonicalFullContext' | 'smartSeamContext'

export interface ContextFramingStrategy {
  mode: 'balanced' | 'horizontal_priority' | 'vertical_priority'
  weightedNeighbors: DirectNeighborKey[]
}

export interface AssembleContextImageResult {
  imageBlob: Blob
  maskBlob: Blob
  cropRect: PackedCropRect
  packedWidth: number
  packedHeight: number
  directNeighborCount: number
  variant: ContextImageVariant
  strategy: ContextFramingStrategy
}

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
        : t.image_filename
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

function getDirectNeighborPresence(neighborUrls: Record<string, string | undefined>): CardinalPresence {
  return {
    up: !!neighborUrls.up,
    down: !!neighborUrls.down,
    left: !!neighborUrls.left,
    right: !!neighborUrls.right,
  }
}

function getContextFramingStrategy(
  variant: ContextImageVariant,
  directNeighbors: CardinalPresence
): ContextFramingStrategy {
  return resolveContextFramingStrategy(variant, directNeighbors)
}

function assembleViaWorker(
  worker: Worker,
  neighborUrls: Record<string, string | undefined>,
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
          packedWidth: event.data.packedWidth,
          packedHeight: event.data.packedHeight,
          directNeighborCount: event.data.directNeighborCount ?? 0,
          variant: event.data.variant ?? variant,
          strategy: event.data.strategy ?? getContextFramingStrategy(variant, getDirectNeighborPresence(neighborUrls)),
        })
      }
    }

    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, neighborUrls, variant })
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
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
}

async function loadCardinalImage(
  neighbor: TileContext['neighbors']['up']
): Promise<HTMLImageElement | undefined> {
  if (!neighbor?.imageUrl) return undefined
  try {
    return await loadImage(neighbor.imageUrl)
  } catch {
    return undefined
  }
}

function drawHtmlNeighbor(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: { x: number; y: number } | undefined,
  cellSize: number,
): void {
  if (!img || !dest) return
  ctx.drawImage(img, 0, 0, img.width, img.height, dest.x, dest.y, cellSize, cellSize)
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas.toBlob returned null'))), 'image/png')
  )
}

function fillHoleMask(
  width: number,
  height: number,
  hole: PackedCropRect
): HTMLCanvasElement {
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = width
  maskCanvas.height = height
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error(CANVAS_2D_UNAVAILABLE)
  maskCtx.fillStyle = PACKED_CANVAS_CSS
  maskCtx.fillRect(0, 0, width, height)
  maskCtx.fillStyle = '#ffffff'
  maskCtx.fillRect(hole.x, hole.y, hole.width, hole.height)
  return maskCanvas
}

async function assembleOnMainThread(
  context: TileContext,
  variant: ContextImageVariant
): Promise<AssembleContextImageResult> {
  const { up, down, left, right } = context.neighbors
  const [upImg, downImg, leftImg, rightImg] = await Promise.all([
    loadCardinalImage(up),
    loadCardinalImage(down),
    loadCardinalImage(left),
    loadCardinalImage(right),
  ])
  const presence: CardinalPresence = {
    up: !!upImg,
    down: !!downImg,
    left: !!leftImg,
    right: !!rightImg,
  }
  const layout = packedCanvasLayout(presence)
  const spec = packedCropSpecFromLayout(layout)
  const strategy = getContextFramingStrategy(variant, presence)

  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.fillStyle = PACKED_CANVAS_CSS
  ctx.fillRect(0, 0, layout.width, layout.height)
  drawHtmlNeighbor(ctx, leftImg, layout.left, layout.cellSize)
  drawHtmlNeighbor(ctx, rightImg, layout.right, layout.cellSize)
  drawHtmlNeighbor(ctx, upImg, layout.up, layout.cellSize)
  drawHtmlNeighbor(ctx, downImg, layout.down, layout.cellSize)
  ctx.fillStyle = PACKED_HOLE_CSS
  ctx.fillRect(layout.hole.x, layout.hole.y, layout.hole.width, layout.hole.height)

  const maskCanvas = fillHoleMask(layout.width, layout.height, layout.hole)
  const [imageBlob, maskBlob] = await Promise.all([
    canvasToPngBlob(canvas),
    canvasToPngBlob(maskCanvas),
  ])

  return {
    imageBlob,
    maskBlob,
    cropRect: spec.cropRect,
    packedWidth: spec.packedWidth,
    packedHeight: spec.packedHeight,
    directNeighborCount: cardinalCount(presence),
    variant,
    strategy,
  }
}

export async function assembleContextImage(
  context: TileContext,
  _size: number = 1024,
  variant: ContextImageVariant = 'canonicalFullContext'
): Promise<AssembleContextImageResult> {
  const worker = typeof window !== 'undefined' ? getWorker() : null

  if (worker) {
    const neighborUrls = extractNeighborUrls(context)
    try {
      return await assembleViaWorker(worker, neighborUrls, variant)
    } catch (err) {
      console.warn('[contextAssembler] Worker failed, falling back to main thread:', err)
    }
  }

  return assembleOnMainThread(context, variant)
}
