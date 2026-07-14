import { MASK_CONFIG } from '@/shared/data/server/prompts'
import { LegnextMaskMode } from '@/trigger/constants/legnext-upload-paint'

export interface LegNextUploadPaintPayload {
  imgUrl: string
  canvas: {
    width: number
    height: number
  }
  imgPos: {
    width: number
    height: number
    x: number
    y: number
  }
  mask:
    | {
        url: string
      }
    | {
        areas: Array<{
          width: number
          height: number
          points: number[]
        }>
      }
  remixPrompt: string
}

const DEFAULT_CANVAS_SIZE = 1024

/**
 * Bounding box of the editable (white) region in a mask, in canvas pixels.
 */
export interface MaskBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * LegNext CanvasImg: image position and size on canvas.
 * - width, height: image dimensions in pixels
 * - x, y: offset from canvas top-left (horizontal, vertical)
 * When maskUrl + maskBounds are provided, imgPos is set to the editable region
 * bounds so the payload matches the actual mask shape (e.g. left 2/3 vs bottom half).
 */
export function buildLegNextUploadPaintPayload(params: {
  imageUrl: string
  remixPrompt: string
  isFirstTile: boolean
  maskUrl?: string
  /** Actual context image width; if omitted, 1024 is used. */
  imageWidth?: number
  /** Actual context image height; if omitted, 1024 is used. */
  imageHeight?: number
  /** When using mask.url: editable region bounds so imgPos differs per mask shape. */
  maskBounds?: MaskBounds
}): {
  payload: LegNextUploadPaintPayload
  maskMode: LegnextMaskMode
} {
  const canvasW = DEFAULT_CANVAS_SIZE
  const canvasH = DEFAULT_CANVAS_SIZE

  let imgW: number
  let imgH: number
  let x: number
  let y: number

  if (params.maskUrl && params.maskBounds) {
    const b = params.maskBounds
    imgW = Math.max(1, Math.min(canvasW, b.width))
    imgH = Math.max(1, Math.min(canvasH, b.height))
    x = Math.max(0, Math.min(canvasW - imgW, b.x))
    y = Math.max(0, Math.min(canvasH - imgH, b.y))
  } else {
    imgW = Math.max(1, Math.min(canvasW, params.imageWidth ?? canvasW))
    imgH = Math.max(1, Math.min(canvasH, params.imageHeight ?? canvasH))
    x = Math.max(0, Math.floor((canvasW - imgW) / 2))
    y = Math.max(0, Math.floor((canvasH - imgH) / 2))
  }

  const maskConfig = params.isFirstTile ? MASK_CONFIG.FULL_CANVAS : MASK_CONFIG.CENTER_512
  const basePayload = {
    imgUrl: params.imageUrl,
    canvas: {
      width: canvasW,
      height: canvasH,
    },
    imgPos: {
      width: imgW,
      height: imgH,
      x,
      y,
    },
    remixPrompt: params.remixPrompt,
  }

  if (!params.isFirstTile && params.maskUrl) {
    return {
      payload: {
        ...basePayload,
        mask: {
          url: params.maskUrl,
        },
      },
      maskMode: LegnextMaskMode.MaskUrl,
    }
  }

  return {
    payload: {
      ...basePayload,
      mask: {
        areas: [
          {
            width: maskConfig.width,
            height: maskConfig.height,
            points: [...maskConfig.points],
          },
        ],
      },
    },
    maskMode: LegnextMaskMode.PolygonAreas,
  }
}
