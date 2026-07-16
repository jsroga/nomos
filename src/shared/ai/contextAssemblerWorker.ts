/**
 * Context Assembler Web Worker
 *
 * Runs entirely off the main thread.
 * Fetches neighbor tile images, composes them onto an OffscreenCanvas,
 * and returns the image + mask blobs back to the caller.
 *
 * Protocol:
 *   IN  → { id, size, neighborUrls }
 *   OUT → { id, imageBlob, maskBlob, cropRect }   (success)
 *       | { id, error }                            (failure)
 */

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

const NEIGHBOR_DIRS: (keyof NeighborUrls)[] = [
  'up',
  'down',
  'left',
  'right',
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
]

interface WorkerInput {
  id: number
  size: number
  neighborUrls: NeighborUrls
  variant?: 'canonicalFullContext' | 'smartSeamContext'
}

const CANVAS_2D_UNAVAILABLE = 'Failed to acquire 2D canvas context'
const NEUTRAL_FILL_RGB = { r: 128, g: 128, b: 128 }
const NEUTRAL_FILL_TOLERANCE = 2

interface WorkerOutputSuccess {
  id: number
  imageBlob: Blob
  maskBlob: Blob
  cropRect: { x: number; y: number; width: number; height: number }
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

/** Load a URL (http/https or data:) into an ImageBitmap without touching the DOM. */
async function fetchImageBitmap(url: string): Promise<ImageBitmap> {
  if (url.startsWith('data:')) {
    // Decode base64 data URL → Blob → ImageBitmap
    const commaIdx = url.indexOf(',')
    const meta = url.slice(0, commaIdx) // e.g. "data:image/png;base64"
    const base64 = url.slice(commaIdx + 1)
    const mimeType = (meta.match(/:(.*?);/) ?? [])[1] ?? 'image/png'
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: mimeType })
    return createImageBitmap(blob)
  }

  // Use 'omit' so cross-origin CDN URLs (Vercel Blob, etc.) aren't blocked by CORS.
  // 'Access-Control-Allow-Origin: *' responses are incompatible with credentialed requests.
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

async function assemble(input: WorkerInput): Promise<WorkerOutputSuccess> {
  const { id, size, neighborUrls, variant = 'canonicalFullContext' } = input

  const TILE_SIZE = 512
  const CONTEXT_SIZE = 256
  const TARGET_X = (size - TILE_SIZE) / 2 // 256
  const TARGET_Y = (size - TILE_SIZE) / 2 // 256

  // Load all neighbor images concurrently
  const bitmaps: Partial<Record<keyof NeighborUrls, ImageBitmap>> = {}

  await Promise.all(
    NEIGHBOR_DIRS.map(async dir => {
      const url = neighborUrls[dir]
      if (!url) return
      try {
        bitmaps[dir] = await fetchImageBitmap(url)
      } catch (e) {
        console.warn(`[contextAssemblerWorker] Failed to load ${dir} neighbor:`, e)
      }
    })
  )

  const directNeighborCount =
    (bitmaps.up ? 1 : 0) +
    (bitmaps.down ? 1 : 0) +
    (bitmaps.left ? 1 : 0) +
    (bitmaps.right ? 1 : 0)
  const directNeighbors = {
    up: !!bitmaps.up,
    down: !!bitmaps.down,
    left: !!bitmaps.left,
    right: !!bitmaps.right,
  }
  const hasHorizontal = directNeighbors.left || directNeighbors.right
  const hasVertical = directNeighbors.up || directNeighbors.down
  const strategy =
    variant === 'smartSeamContext' && hasHorizontal && !hasVertical
      ? {
          mode: 'horizontal_priority' as const,
          weightedNeighbors: (['left', 'right'] as const).filter(key => directNeighbors[key]),
        }
      : variant === 'smartSeamContext' && hasVertical && !hasHorizontal
        ? {
            mode: 'vertical_priority' as const,
            weightedNeighbors: (['up', 'down'] as const).filter(key => directNeighbors[key]),
          }
        : {
            mode: 'balanced' as const,
            weightedNeighbors: (['up', 'down', 'left', 'right'] as const).filter(
              key => directNeighbors[key]
            ),
          }

  // ------------------------------------------------------------------
  // Image canvas
  // ------------------------------------------------------------------
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(CANVAS_2D_UNAVAILABLE)

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  /** Source crop helpers (same logic as main-thread assembler) */
  const cornerCrop = (
    bmp: ImageBitmap,
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ) => {
    const ratio = CONTEXT_SIZE / TILE_SIZE
    const { width: w, height: h } = bmp
    switch (corner) {
      case 'topLeft': return { sx: 0, sy: 0, sw: w * ratio, sh: h * ratio }
      case 'topRight': return { sx: w * (1 - ratio), sy: 0, sw: w * ratio, sh: h * ratio }
      case 'bottomLeft': return { sx: 0, sy: h * (1 - ratio), sw: w * ratio, sh: h * ratio }
      case 'bottomRight': return { sx: w * (1 - ratio), sy: h * (1 - ratio), sw: w * ratio, sh: h * ratio }
    }
  }

  const edgeCrop = (bmp: ImageBitmap, edge: 'top' | 'bottom' | 'left' | 'right') => {
    const ratio = CONTEXT_SIZE / TILE_SIZE
    const { width: w, height: h } = bmp
    switch (edge) {
      case 'top': return { sx: 0, sy: 0, sw: w, sh: h * ratio }
      case 'bottom': return { sx: 0, sy: h * (1 - ratio), sw: w, sh: h * ratio }
      case 'left': return { sx: 0, sy: 0, sw: w * ratio, sh: h }
      case 'right': return { sx: w * (1 - ratio), sy: 0, sw: w * ratio, sh: h }
    }
  }

  // CORNERS (drawn first so direct neighbors overlay them), then DIRECT
  // NEIGHBORS. Wrapped so their eight branches don't inflate `assemble`.
  const drawNeighborTiles = () => {
    if (bitmaps.topLeft) {
      const { sx, sy, sw, sh } = cornerCrop(bitmaps.topLeft, 'bottomRight')
      ctx.drawImage(bitmaps.topLeft, sx, sy, sw, sh, 0, 0, CONTEXT_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.topRight) {
      const { sx, sy, sw, sh } = cornerCrop(bitmaps.topRight, 'bottomLeft')
      ctx.drawImage(bitmaps.topRight, sx, sy, sw, sh, TARGET_X + TILE_SIZE, 0, CONTEXT_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.bottomLeft) {
      const { sx, sy, sw, sh } = cornerCrop(bitmaps.bottomLeft, 'topRight')
      ctx.drawImage(bitmaps.bottomLeft, sx, sy, sw, sh, 0, TARGET_Y + TILE_SIZE, CONTEXT_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.bottomRight) {
      const { sx, sy, sw, sh } = cornerCrop(bitmaps.bottomRight, 'topLeft')
      ctx.drawImage(bitmaps.bottomRight, sx, sy, sw, sh, TARGET_X + TILE_SIZE, TARGET_Y + TILE_SIZE, CONTEXT_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.up) {
      const { sx, sy, sw, sh } = edgeCrop(bitmaps.up, 'bottom')
      ctx.drawImage(bitmaps.up, sx, sy, sw, sh, TARGET_X, 0, TILE_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.down) {
      const { sx, sy, sw, sh } = edgeCrop(bitmaps.down, 'top')
      ctx.drawImage(bitmaps.down, sx, sy, sw, sh, TARGET_X, TARGET_Y + TILE_SIZE, TILE_SIZE, CONTEXT_SIZE)
    }
    if (bitmaps.left) {
      const { sx, sy, sw, sh } = edgeCrop(bitmaps.left, 'right')
      ctx.drawImage(bitmaps.left, sx, sy, sw, sh, 0, TARGET_Y, CONTEXT_SIZE, TILE_SIZE)
    }
    if (bitmaps.right) {
      const { sx, sy, sw, sh } = edgeCrop(bitmaps.right, 'left')
      ctx.drawImage(bitmaps.right, sx, sy, sw, sh, TARGET_X + TILE_SIZE, TARGET_Y, CONTEXT_SIZE, TILE_SIZE)
    }
  }
  drawNeighborTiles()

  const drawSmartCornerFromEdge = (
    bmp: ImageBitmap | undefined,
    edge: 'top' | 'bottom' | 'left' | 'right',
    sourceHalf: 'start' | 'end',
    destX: number,
    destY: number
  ) => {
    if (!bmp || variant !== 'smartSeamContext') return
    const edgeSrc = edgeCrop(bmp, edge)
    const useVerticalHalf = edge === 'left' || edge === 'right'
    const src = useVerticalHalf
      ? {
          sx: edgeSrc.sx,
          sy: sourceHalf === 'start' ? edgeSrc.sy : edgeSrc.sy + edgeSrc.sh / 2,
          sw: edgeSrc.sw,
          sh: edgeSrc.sh / 2,
        }
      : {
          sx: sourceHalf === 'start' ? edgeSrc.sx : edgeSrc.sx + edgeSrc.sw / 2,
          sy: edgeSrc.sy,
          sw: edgeSrc.sw / 2,
          sh: edgeSrc.sh,
        }
    ctx.drawImage(bmp, src.sx, src.sy, src.sw, src.sh, destX, destY, CONTEXT_SIZE, CONTEXT_SIZE)
  }

  const drawSmartSeamCorners = () => {
    const farX = TARGET_X + TILE_SIZE
    const farY = TARGET_Y + TILE_SIZE
    if (strategy.mode === 'horizontal_priority') {
      if (!bitmaps.topLeft) drawSmartCornerFromEdge(bitmaps.left, 'right', 'start', 0, 0)
      if (!bitmaps.bottomLeft) drawSmartCornerFromEdge(bitmaps.left, 'right', 'end', 0, farY)
      if (!bitmaps.topRight) drawSmartCornerFromEdge(bitmaps.right, 'left', 'start', farX, 0)
      if (!bitmaps.bottomRight) drawSmartCornerFromEdge(bitmaps.right, 'left', 'end', farX, farY)
    }
    if (strategy.mode === 'vertical_priority') {
      if (!bitmaps.topLeft) drawSmartCornerFromEdge(bitmaps.up, 'bottom', 'start', 0, 0)
      if (!bitmaps.topRight) drawSmartCornerFromEdge(bitmaps.up, 'bottom', 'end', farX, 0)
      if (!bitmaps.bottomLeft) drawSmartCornerFromEdge(bitmaps.down, 'top', 'start', 0, farY)
      if (!bitmaps.bottomRight) drawSmartCornerFromEdge(bitmaps.down, 'top', 'end', farX, farY)
    }
  }
  drawSmartSeamCorners()

  ctx.fillStyle = '#808080'
  ctx.fillRect(TARGET_X, TARGET_Y, TILE_SIZE, TILE_SIZE)

  const imageBlob = await canvas.convertToBlob({ type: 'image/png' })

  // ------------------------------------------------------------------
  // Mask canvas
  // ------------------------------------------------------------------
  const maskCanvas = new OffscreenCanvas(size, size)
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

  const maskBlob = await maskCanvas.convertToBlob({ type: 'image/png' })

  // Free ImageBitmap memory
  Object.values(bitmaps).forEach(bmp => bmp?.close())

  return {
    id,
    imageBlob,
    maskBlob,
    cropRect: { x: TARGET_X, y: TARGET_Y, width: TILE_SIZE, height: TILE_SIZE },
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
