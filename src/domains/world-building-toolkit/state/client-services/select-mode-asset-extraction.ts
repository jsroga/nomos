import {
  CanvasContextType,
  ContentType,
  HtmlElementTag,
  SelectModeErrorMessage,
  SelectModeLogMessage,
} from '../../constants/select-mode-service'
import { loadImage } from './select-mode-image-utils'

function cropToContent(canvas: HTMLCanvasElement): {
  dataUrl: string
  offsetX: number
  offsetY: number
  width: number
  height: number
} {
  const ctx = canvas.getContext(CanvasContextType.TwoD)
  if (!ctx)
    return {
      dataUrl: canvas.toDataURL(ContentType.Png),
      offsetX: 0,
      offsetY: 0,
      width: canvas.width,
      height: canvas.height,
    }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData

  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 0) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return {
      dataUrl: canvas.toDataURL(ContentType.Png),
      offsetX: 0,
      offsetY: 0,
      width: canvas.width,
      height: canvas.height,
    }
  }

  const padding = 2
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)

  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1

  const croppedCanvas = document.createElement(HtmlElementTag.Canvas)
  croppedCanvas.width = cropWidth
  croppedCanvas.height = cropHeight
  const croppedCtx = croppedCanvas.getContext(CanvasContextType.TwoD)
  if (!croppedCtx)
    return {
      dataUrl: canvas.toDataURL(ContentType.Png),
      offsetX: 0,
      offsetY: 0,
      width: canvas.width,
      height: canvas.height,
    }

  croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

  return {
    dataUrl: croppedCanvas.toDataURL(ContentType.Png),
    offsetX: minX,
    offsetY: minY,
    width: cropWidth,
    height: cropHeight,
  }
}

export async function extractAsset(
  contextImageUrl: string,
  maskUrl: string,
  originalBounds: { x: number; y: number; width: number; height: number }
): Promise<{
  dataUrl: string
  bounds: { x: number; y: number; width: number; height: number }
}> {
  const [contextImg, maskImg] = await Promise.all([
    loadImage(contextImageUrl),
    loadImage(maskUrl),
  ])

  const width = contextImg.width
  const height = contextImg.height

  const scale = width / originalBounds.width

  console.log(SelectModeLogMessage.ExtractAsset, {
    imageSize: { width, height },
    originalBounds,
    scale,
  })

  const contextCanvas = document.createElement(HtmlElementTag.Canvas)
  contextCanvas.width = width
  contextCanvas.height = height
  const contextCtx = contextCanvas.getContext(CanvasContextType.TwoD)
  if (!contextCtx) throw new Error(SelectModeErrorMessage.FailedToCreateContextCanvas)
  contextCtx.drawImage(contextImg, 0, 0)
  const contextData = contextCtx.getImageData(0, 0, width, height)

  const maskCanvas = document.createElement(HtmlElementTag.Canvas)
  maskCanvas.width = width
  maskCanvas.height = height
  const maskCtx = maskCanvas.getContext(CanvasContextType.TwoD)
  if (!maskCtx) throw new Error(SelectModeErrorMessage.FailedToCreateMaskCanvas)
  maskCtx.drawImage(maskImg, 0, 0, width, height)
  const maskData = maskCtx.getImageData(0, 0, width, height)

  const outputCanvas = document.createElement(HtmlElementTag.Canvas)
  outputCanvas.width = width
  outputCanvas.height = height
  const outputCtx = outputCanvas.getContext(CanvasContextType.TwoD)
  if (!outputCtx) throw new Error(SelectModeErrorMessage.FailedToCreateOutputCanvas)
  const outputData = outputCtx.createImageData(width, height)

  for (let i = 0; i < contextData.data.length; i += 4) {
    const maskA = maskData.data[i + 3]
    const isMasked = maskA > 50

    if (isMasked) {
      outputData.data[i] = contextData.data[i]
      outputData.data[i + 1] = contextData.data[i + 1]
      outputData.data[i + 2] = contextData.data[i + 2]
      outputData.data[i + 3] = 255
    } else {
      outputData.data[i] = 0
      outputData.data[i + 1] = 0
      outputData.data[i + 2] = 0
      outputData.data[i + 3] = 0
    }
  }

  outputCtx.putImageData(outputData, 0, 0)

  const cropResult = cropToContent(outputCanvas)

  const worldOffsetX = cropResult.offsetX / scale
  const worldOffsetY = cropResult.offsetY / scale
  const worldWidth = cropResult.width / scale
  const worldHeight = cropResult.height / scale

  console.log(SelectModeLogMessage.CropResult, {
    pixelOffset: { x: cropResult.offsetX, y: cropResult.offsetY },
    pixelSize: { w: cropResult.width, h: cropResult.height },
    worldOffset: { x: worldOffsetX, y: worldOffsetY },
    worldSize: { w: worldWidth, h: worldHeight },
  })

  return {
    dataUrl: cropResult.dataUrl,
    bounds: {
      x: originalBounds.x + worldOffsetX,
      y: originalBounds.y + worldOffsetY,
      width: worldWidth,
      height: worldHeight,
    },
  }
}
