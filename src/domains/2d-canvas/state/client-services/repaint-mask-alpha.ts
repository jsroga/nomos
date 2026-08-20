import {
  CanvasContextType,
  HtmlElementTag,
  RepaintCanvasFilter,
  RepaintCompositeOp,
  RepaintImageMime,
  RepaintRgba,
  RepaintServiceError,
  canvasBlurFilter,
} from '../../constants/repaint-service'
import { loadImageFromUrl } from './repaint-tile-composite'

export function applyLuminanceToAlpha(data: Uint8ClampedArray): void {
  for (let index = 0; index < data.length; index += RepaintRgba.Stride) {
    const luminance = data[index + RepaintRgba.Red]
    data[index + RepaintRgba.Red] = 255
    data[index + RepaintRgba.Green] = 255
    data[index + RepaintRgba.Blue] = 255
    data[index + RepaintRgba.Alpha] = luminance
  }
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext(CanvasContextType.TwoD)
  if (!ctx) {
    throw new Error(RepaintServiceError.FailedToAcquireCanvasContext)
  }
  return ctx
}

export async function punchRepaintMaskAlpha(input: {
  imageUrl: string
  maskUrl: string
  featherPx: number
}): Promise<string> {
  const [image, mask] = await Promise.all([
    loadImageFromUrl(input.imageUrl),
    loadImageFromUrl(input.maskUrl),
  ])

  const canvas = document.createElement(HtmlElementTag.Canvas)
  canvas.width = image.width
  canvas.height = image.height
  const ctx = requireContext(canvas)
  ctx.drawImage(image, 0, 0)

  const maskCanvas = document.createElement(HtmlElementTag.Canvas)
  maskCanvas.width = image.width
  maskCanvas.height = image.height
  const maskCtx = requireContext(maskCanvas)
  const blurPx =
    mask.width > 0 ? Math.max(0, (input.featherPx * image.width) / mask.width) : input.featherPx
  if (blurPx > 0) {
    maskCtx.filter = canvasBlurFilter(blurPx)
  }
  maskCtx.drawImage(mask, 0, 0, image.width, image.height)
  maskCtx.filter = RepaintCanvasFilter.None
  const pixels = maskCtx.getImageData(0, 0, image.width, image.height)
  applyLuminanceToAlpha(pixels.data)
  maskCtx.putImageData(pixels, 0, 0)

  ctx.globalCompositeOperation = RepaintCompositeOp.DestinationIn
  ctx.drawImage(maskCanvas, 0, 0)
  return canvas.toDataURL(RepaintImageMime.Png)
}
