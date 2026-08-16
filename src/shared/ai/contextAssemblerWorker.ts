/**
 * Context Assembler Web Worker
 *
 * Protocol:
 *   IN  → { id, neighborUrls, variant? }
 *   OUT → { id, imageBlob, maskBlob, cropRect, packedWidth, packedHeight } (success)
 *       | { id, error }
 */
import { resolveContextFramingStrategy } from './contextAssembler-framing-strategy'
import { buildHoleMask } from './contextAssembler-mask'
import {
  packedCanvasLayout,
  packedCropSpecFromLayout,
  cardinalCount,
  PACKED_CANVAS_CSS,
  PACKED_HOLE_CSS,
  type CardinalPresence,
} from './context-pack-layout'

interface NeighborUrls {
  up?: string
  down?: string
  left?: string
  right?: string
  topLeft?: string
  topRight?: string
  bottomLeft?: string
  bottomRight?: string
}

const CARDINAL_DIRS = ['up', 'down', 'left', 'right'] as const

interface WorkerInput {
  id: number
  size?: number
  neighborUrls: NeighborUrls
  variant?: 'canonicalFullContext' | 'smartSeamContext'
}

const CANVAS_2D_UNAVAILABLE = 'Failed to acquire 2D canvas context'

interface WorkerOutputSuccess {
  id: number
  imageBlob: Blob
  maskBlob: Blob
  cropRect: { x: number; y: number; width: number; height: number }
  packedWidth: number
  packedHeight: number
  directNeighborCount: number
  variant: 'canonicalFullContext' | 'smartSeamContext'
  strategy: {
    mode: 'balanced' | 'horizontal_priority' | 'vertical_priority'
    weightedNeighbors: Array<'up' | 'down' | 'left' | 'right'>
  }
}

interface WorkerOutputError {
  id: number
  error: string
}

async function fetchImageBitmap(url: string): Promise<ImageBitmap> {
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',')
    const meta = url.slice(0, commaIdx)
    const base64 = url.slice(commaIdx + 1)
    const mimeType = (meta.match(/:(.*?);/) ?? [])[1] ?? 'image/png'
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: mimeType })
    return createImageBitmap(blob)
  }

  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

function drawNeighbor(
  ctx: OffscreenCanvasRenderingContext2D,
  bmp: ImageBitmap | undefined,
  dest: { x: number; y: number } | undefined,
  cellSize: number,
): void {
  if (!bmp || !dest) return
  ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, dest.x, dest.y, cellSize, cellSize)
}

async function assemble(input: WorkerInput): Promise<WorkerOutputSuccess> {
  const { id, neighborUrls, variant = 'canonicalFullContext' } = input
  const bitmaps: Partial<Record<(typeof CARDINAL_DIRS)[number], ImageBitmap>> = {}

  await Promise.all(
    CARDINAL_DIRS.map(async dir => {
      const url = neighborUrls[dir]
      if (!url) return
      try {
        bitmaps[dir] = await fetchImageBitmap(url)
      } catch (e) {
        console.warn(`[contextAssemblerWorker] Failed to load ${dir} neighbor:`, e)
      }
    })
  )

  const presence: CardinalPresence = {
    up: !!bitmaps.up,
    down: !!bitmaps.down,
    left: !!bitmaps.left,
    right: !!bitmaps.right,
  }
  const layout = packedCanvasLayout(presence)
  const spec = packedCropSpecFromLayout(layout)
  const directNeighborCount = cardinalCount(presence)
  const strategy = resolveContextFramingStrategy(variant, presence)

  const canvas = new OffscreenCanvas(layout.width, layout.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(CANVAS_2D_UNAVAILABLE)

  ctx.fillStyle = PACKED_CANVAS_CSS
  ctx.fillRect(0, 0, layout.width, layout.height)
  drawNeighbor(ctx, bitmaps.left, layout.left, layout.cellSize)
  drawNeighbor(ctx, bitmaps.right, layout.right, layout.cellSize)
  drawNeighbor(ctx, bitmaps.up, layout.up, layout.cellSize)
  drawNeighbor(ctx, bitmaps.down, layout.down, layout.cellSize)
  ctx.fillStyle = PACKED_HOLE_CSS
  ctx.fillRect(layout.hole.x, layout.hole.y, layout.hole.width, layout.hole.height)

  const imageBlob = await canvas.convertToBlob({ type: 'image/png' })
  const maskBlob = await buildHoleMask(layout.width, layout.height, layout.hole)
  Object.values(bitmaps).forEach(bmp => bmp?.close())

  return {
    id,
    imageBlob,
    maskBlob,
    cropRect: spec.cropRect,
    packedWidth: spec.packedWidth,
    packedHeight: spec.packedHeight,
    directNeighborCount,
    variant,
    strategy,
  }
}

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  try {
    const result = await assemble(event.data)
    self.postMessage(result)
  } catch (err) {
    const out: WorkerOutputError = {
      id: event.data.id,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(out)
  }
}
