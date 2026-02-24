import { TileContext } from './types'

/**
 * Creates a composite image and mask for outpainting using an Edge-Strip Strategy.
 *
 * New Strategy (Edge-Strip):
 * - Canvas: 1024x1024 (DALL-E 2 standard)
 * - Target Tile: Centered 512x512 area (256,256 to 768,768)
 * - Context: Only the edge strips from neighbors (128px wide/tall)
 *
 * This minimizes gray background pollution while providing enough edge context
 * for seamless blending.
 *
 * Layout:
 * - Center (256,256 -> 768,768): Target tile (masked for generation)
 * - Top edge (256,128 -> 768,256): Bottom 128px of Up neighbor
 * - Bottom edge (256,768 -> 768,896): Top 128px of Down neighbor
 * - Left edge (128,256 -> 256,768): Right 128px of Left neighbor
 * - Right edge (768,256 -> 896,768): Left 128px of Right neighbor
 *
 * Everything else remains transparent (no gray pollution).
 */

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export async function assembleContextImage(
  context: TileContext,
  size: number = 1024
): Promise<{ imageBlob: Blob; maskBlob: Blob; cropRect: CropRect }> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // Start with neutral gray background
  // This prevents DALL-E from hallucinating in transparent voids
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const TILE_SIZE = 512
  // Maximize context: In a 1024 canvas with 512 target centered,
  // we have (1024-512)/2 = 256px of space on each side.
  const CONTEXT_SIZE = 256

  // Target tile is centered
  const TARGET_X = (size - TILE_SIZE) / 2 // 256
  const TARGET_Y = (size - TILE_SIZE) / 2 // 256

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Reject non-image data URIs (e.g. data:text/html) that the browser can't load as images
      if (src.startsWith('data:') && !src.startsWith('data:image/')) {
        const mimeType = src.substring(0, src.indexOf(';')) || src.substring(0, 50)
        console.warn('[contextAssembler] Skipping non-image data URI:', mimeType)
        reject(new Error(`Cannot load non-image data URI: ${mimeType}`))
        return
      }

      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        console.log('[contextAssembler] Image loaded:', {
          src: src.substring(0, 50) + '...',
          width: img.width,
          height: img.height,
          complete: img.complete,
        })
        resolve(img)
      }
      img.onerror = e => {
        console.error('[contextAssembler] Failed to load image:', {
          src: src.substring(0, 50) + '...',
          error: e,
        })
        reject(e)
      }
      img.src = src
    })
  }

  const { up, down, left, right, topLeft, topRight, bottomLeft, bottomRight } = context.neighbors

  // Log the neighbors we received with URL details
  const getUrlInfo = (url: string | undefined) => {
    if (!url) return 'none'
    if (url.startsWith('data:image/')) return `dataUrl (${url.length} chars)`
    if (url.startsWith('/projects/')) return `local: ${url}`
    if (url.startsWith('http')) return `remote: ${url.substring(0, 50)}...`
    return `unknown: ${url.substring(0, 30)}...`
  }

  console.log('[contextAssembler] Neighbors received:', {
    up: getUrlInfo(up?.imageUrl),
    down: getUrlInfo(down?.imageUrl),
    left: getUrlInfo(left?.imageUrl),
    right: getUrlInfo(right?.imageUrl),
    topLeft: getUrlInfo(topLeft?.imageUrl),
    topRight: getUrlInfo(topRight?.imageUrl),
    bottomLeft: getUrlInfo(bottomLeft?.imageUrl),
    bottomRight: getUrlInfo(bottomRight?.imageUrl),
  })

  // Helper to calculate source crop based on actual image size
  // Images can be different sizes (512, 1024, 2048 etc due to upscaling)
  // We want to take the correct PROPORTION of the edge
  const getScaledCornerCrop = (
    img: HTMLImageElement,
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ) => {
    const imgW = img.width
    const imgH = img.height
    const ratio = CONTEXT_SIZE / TILE_SIZE // 0.5

    switch (corner) {
      case 'topLeft':
        return { x: 0, y: 0, w: imgW * ratio, h: imgH * ratio }
      case 'topRight':
        return { x: imgW * (1 - ratio), y: 0, w: imgW * ratio, h: imgH * ratio }
      case 'bottomLeft':
        return { x: 0, y: imgH * (1 - ratio), w: imgW * ratio, h: imgH * ratio }
      case 'bottomRight':
        return { x: imgW * (1 - ratio), y: imgH * (1 - ratio), w: imgW * ratio, h: imgH * ratio }
    }
  }

  // Draw neighbors (Maximize context to 256px overlap)

  // CORNER NEIGHBORS (Draw first so direct neighbors overlay them if needed)
  // TOP-LEFT corner: we need bottom-right corner of the topLeft tile
  if (topLeft?.imageUrl) {
    try {
      const img = await loadImage(topLeft.imageUrl)
      const src = getScaledCornerCrop(img, 'bottomRight')
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src (bottom-right corner of neighbor)
        0,
        0,
        CONTEXT_SIZE,
        CONTEXT_SIZE // dest (top-left corner of canvas)
      )
    } catch (e) {
      console.error('Failed to load topLeft neighbor', e)
    }
  }

  // TOP-RIGHT corner: we need bottom-left corner of the topRight tile
  if (topRight?.imageUrl) {
    try {
      const img = await loadImage(topRight.imageUrl)
      const src = getScaledCornerCrop(img, 'bottomLeft')
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src (bottom-left corner of neighbor)
        TARGET_X + TILE_SIZE,
        0,
        CONTEXT_SIZE,
        CONTEXT_SIZE // dest (top-right corner of canvas)
      )
    } catch (e) {
      console.error('Failed to load topRight neighbor', e)
    }
  }

  // BOTTOM-LEFT corner: we need top-right corner of the bottomLeft tile
  if (bottomLeft?.imageUrl) {
    try {
      const img = await loadImage(bottomLeft.imageUrl)
      const src = getScaledCornerCrop(img, 'topRight')
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src (top-right corner of neighbor)
        0,
        TARGET_Y + TILE_SIZE,
        CONTEXT_SIZE,
        CONTEXT_SIZE // dest (bottom-left corner of canvas)
      )
    } catch (e) {
      console.error('Failed to load bottomLeft neighbor', e)
    }
  }

  // BOTTOM-RIGHT corner: we need top-left corner of the bottomRight tile
  if (bottomRight?.imageUrl) {
    try {
      const img = await loadImage(bottomRight.imageUrl)
      const src = getScaledCornerCrop(img, 'topLeft')
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src (top-left corner of neighbor)
        TARGET_X + TILE_SIZE,
        TARGET_Y + TILE_SIZE,
        CONTEXT_SIZE,
        CONTEXT_SIZE // dest (bottom-right corner of canvas)
      )
    } catch (e) {
      console.error('Failed to load bottomRight neighbor', e)
    }
  }

  // Helper to calculate source crop for edge neighbors based on actual image size
  const getScaledEdgeCrop = (img: HTMLImageElement, edge: 'top' | 'bottom' | 'left' | 'right') => {
    const imgW = img.width
    const imgH = img.height
    // Context ratio: we want 256/512 = 0.5 of each edge
    const ratio = CONTEXT_SIZE / TILE_SIZE

    switch (edge) {
      case 'top':
        // Top strip: full width, top portion of height
        return { x: 0, y: 0, w: imgW, h: imgH * ratio }
      case 'bottom':
        // Bottom strip: full width, bottom portion of height
        return { x: 0, y: imgH * (1 - ratio), w: imgW, h: imgH * ratio }
      case 'left':
        // Left strip: left portion of width, full height
        return { x: 0, y: 0, w: imgW * ratio, h: imgH }
      case 'right':
        // Right strip: right portion of width, full height
        return { x: imgW * (1 - ratio), y: 0, w: imgW * ratio, h: imgH }
    }
  }

  // DIRECT NEIGHBORS
  // UP neighbor: Draw bottom strip
  if (up?.imageUrl) {
    try {
      const img = await loadImage(up.imageUrl)
      const src = getScaledEdgeCrop(img, 'bottom')
      // Dest: top area above target (256, 0, 512, 256)
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src - scaled to actual image size
        TARGET_X,
        0,
        TILE_SIZE,
        CONTEXT_SIZE // dest - always 512x256
      )
    } catch (e) {
      console.error('Failed to load up neighbor', e)
    }
  }

  // DOWN neighbor: Draw top strip
  if (down?.imageUrl) {
    try {
      const img = await loadImage(down.imageUrl)
      const src = getScaledEdgeCrop(img, 'top')
      // Dest: bottom area below target (256, 768, 512, 256)
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src
        TARGET_X,
        TARGET_Y + TILE_SIZE,
        TILE_SIZE,
        CONTEXT_SIZE // dest
      )
    } catch (e) {
      console.error('Failed to load down neighbor', e)
    }
  }

  // LEFT neighbor: Draw right strip
  if (left?.imageUrl) {
    try {
      const img = await loadImage(left.imageUrl)
      const src = getScaledEdgeCrop(img, 'right')
      // Dest: left area left of target (0, 256, 256, 512)
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src
        0,
        TARGET_Y,
        CONTEXT_SIZE,
        TILE_SIZE // dest
      )
    } catch (e) {
      console.error('Failed to load left neighbor', e)
    }
  }

  // RIGHT neighbor: Draw left strip
  if (right?.imageUrl) {
    try {
      const img = await loadImage(right.imageUrl)
      const src = getScaledEdgeCrop(img, 'left')
      // Dest: right area right of target (768, 256, 256, 512)
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.w,
        src.h, // src
        TARGET_X + TILE_SIZE,
        TARGET_Y,
        CONTEXT_SIZE,
        TILE_SIZE // dest
      )
    } catch (e) {
      console.error('Failed to load right neighbor', e)
    }
  }

  // Ensure the target area is explicitly gray (visual mask) to match the prompt
  ctx.fillStyle = '#808080'
  ctx.fillRect(TARGET_X, TARGET_Y, TILE_SIZE, TILE_SIZE)

  // DEBUG: Verify canvas content before converting to blob
  const verifyPixel = (x: number, y: number, label: string) => {
    const pixel = ctx.getImageData(x, y, 1, 1).data
    return { label, x, y, rgba: Array.from(pixel) }
  }

  console.log('[contextAssembler] Canvas verification:', {
    size: { width: canvas.width, height: canvas.height },
    pixels: [
      verifyPixel(0, 0, 'top-left'),
      verifyPixel(512, 0, 'top-center'),
      verifyPixel(512, 512, 'center'),
      verifyPixel(1023, 1023, 'bottom-right'),
    ],
  })

  // Check if canvas has any content (not all zeros)
  const sampleData = ctx.getImageData(0, 0, 100, 100).data
  const hasContent = sampleData.some(v => v > 0)
  console.log('[contextAssembler] Canvas has content:', hasContent)

  // Create mask
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = size
  maskCanvas.height = size
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error('Could not get mask context')

  // Mask: Fill entire canvas with white (keep), then clear target area (edit)
  maskCtx.fillStyle = 'white'
  maskCtx.fillRect(0, 0, size, size)

  // Clear the center target area - this is where DALL-E will generate
  maskCtx.clearRect(TARGET_X, TARGET_Y, TILE_SIZE, TILE_SIZE)

  // Convert canvas to blob with proper error handling
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => {
      if (!b) {
        console.error(
          '[contextAssembler] Failed to create image blob - canvas.toBlob returned null'
        )
        reject(new Error('Failed to create image blob'))
        return
      }
      console.log('[contextAssembler] Image blob created:', { size: b.size, type: b.type })
      resolve(b)
    }, 'image/png')
  })

  const maskBlob = await new Promise<Blob>((resolve, reject) => {
    maskCanvas.toBlob(b => {
      if (!b) {
        console.error('[contextAssembler] Failed to create mask blob - canvas.toBlob returned null')
        reject(new Error('Failed to create mask blob'))
        return
      }
      resolve(b)
    }, 'image/png')
  })

  console.log('[contextAssembler] Final output:', {
    imageBlobSize: imageBlob.size,
    maskBlobSize: maskBlob.size,
    cropRect: { x: TARGET_X, y: TARGET_Y, width: TILE_SIZE, height: TILE_SIZE },
  })

  return {
    imageBlob,
    maskBlob,
    cropRect: {
      x: TARGET_X,
      y: TARGET_Y,
      width: TILE_SIZE,
      height: TILE_SIZE,
    },
  }
}
