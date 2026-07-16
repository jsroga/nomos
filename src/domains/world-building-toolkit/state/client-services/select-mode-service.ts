import type { Tile } from '../../core/world-types'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  ContentType,
  HtmlElementTag,
  CanvasContextType,
  ImageCrossOrigin,
  SegmentationProvider,
  SelectModeErrorMessage,
  SelectModeLogLabel,
  SelectModeLogMessage,
  UrlScheme,
} from '../../constants/select-mode-service'
import {
  computePixelLayout,
  computeRelativeBox,
  computeTileRange,
  computeWorldBoundsFromBox,
} from './select-mode-segment-bounds'
import {
  buildContextCanvasBase64,
  computeEffectiveTileSize,
  detectTileResolution,
} from './select-mode-segment-context'
import { runSegmentationRequest } from './select-mode-segment-api'

declare global {
  interface Window {
    __DEBUG_CONTEXT_IMAGE__?: string
  }
}

export interface SelectBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SelectResult {
  imageUrl: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  debugInfo?: {
    contextImage: string
    box: SelectBox
    apiResponse: unknown
    maskUrl?: string
    error?: string
    scale?: number
    worldBounds?: { x: number; y: number; width: number; height: number }
    pixelBounds?: { x: number; y: number; width: number; height: number }
  }
}

export class SelectModeService {
  private TILE_SIZE = 512
  private abortController: AbortController | null = null

  private getSegmentationProvider(): SegmentationProvider {
    const provider = browserStorage.getString(LocalStorageKeys.AI_SEGMENTATION_PROVIDER)
    if (provider === SegmentationProvider.Replicate) return SegmentationProvider.Replicate
    return SegmentationProvider.Fal
  }

  private getFalApiKey(): string {
    return browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_FAL)
  }

  private getReplicateApiKey(): string {
    return browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_REPLICATE)
  }

  private getSamParams(): {
    returnMultipleMasks?: boolean
    includeScores?: boolean
    includeBoxes?: boolean
  } {
    const config = browserStorage.getJson(LocalStorageKeys.AI_CONFIG_FAL)
    if (!config) return {}
    return {
      returnMultipleMasks: config.returnMultipleMasks === true,
      includeScores: config.includeScores === true,
      includeBoxes: config.includeBoxes === true,
    }
  }

  async segmentObject(
    box: SelectBox,
    tiles: Record<string, Tile>,
    projectId: string,
    textPrompt?: string
  ): Promise<SelectResult> {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    const PADDING = 32
    const worldBounds = computeWorldBoundsFromBox(box, PADDING)
    const tileRange = computeTileRange(worldBounds, this.TILE_SIZE)

    const tileResolution = await detectTileResolution({
      tileRange,
      tiles,
      projectId,
      defaultTileSize: this.TILE_SIZE,
      loadImage: url => this.loadImage(url),
    })

    const scale = tileResolution / this.TILE_SIZE
    const { pixelBounds, finalScale } = computePixelLayout(worldBounds, scale)
    const effectiveTileSize = computeEffectiveTileSize(this.TILE_SIZE, finalScale)

    console.log(
      `[SelectModeService] Scale: ${finalScale} (original: ${scale}), World bounds:`,
      worldBounds,
      SelectModeLogLabel.PixelBounds,
      pixelBounds,
      SelectModeLogLabel.EffectiveTileSize,
      effectiveTileSize
    )

    const base64Image = await buildContextCanvasBase64({
      tiles,
      projectId,
      tileRange,
      worldBounds,
      pixelBounds,
      effectiveTileSize,
      loadImage: url => this.loadImage(url),
    })

    const relativeBox = computeRelativeBox(box, worldBounds, finalScale)

    let maskUrl = ''
    let apiResponse: unknown = null

    try {
      const segmentation = await runSegmentationRequest({
        provider: this.getSegmentationProvider(),
        base64Image,
        relativeBox,
        pixelBounds,
        textPrompt,
        replicateApiKey: this.getReplicateApiKey(),
        falApiKey: this.getFalApiKey(),
        samParams: this.getSamParams(),
        signal: this.abortController.signal,
        fetchMaskAsDataUrl: (url, width, height) => this.fetchMaskAsDataUrl(url, width, height),
        resizeMask: (dataUrl, sourceWidth, sourceHeight, targetWidth, targetHeight) =>
          this.resizeMask(dataUrl, sourceWidth, sourceHeight, targetWidth, targetHeight),
      })

      maskUrl = segmentation.maskUrl
      apiResponse = segmentation.apiResponse

      return {
        imageUrl: maskUrl,
        bounds: {
          x: worldBounds.x,
          y: worldBounds.y,
          width: worldBounds.width,
          height: worldBounds.height,
        },
        debugInfo: {
          contextImage: base64Image,
          box: relativeBox,
          apiResponse,
          maskUrl,
          scale: finalScale,
          worldBounds,
          pixelBounds,
        },
      }
    } catch (error: unknown) {
      console.error(SelectModeLogMessage.ErrorDuringSegmentation, error)
      return {
        imageUrl: maskUrl,
        bounds: {
          x: worldBounds.x,
          y: worldBounds.y,
          width: worldBounds.width,
          height: worldBounds.height,
        },
        debugInfo: {
          contextImage: base64Image,
          box: relativeBox,
          apiResponse,
          maskUrl,
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      if (url.startsWith(UrlScheme.Http)) {
        img.crossOrigin = ImageCrossOrigin.Anonymous
      }
      img.onload = () => resolve(img)
      img.onerror = e => reject(new Error(`Failed to load image at ${url}: ${e}`))
      img.src = url
    })
  }

  /**
   * Fetch a remote mask image URL and convert it to a data URL
   * Resizes to match the context image dimensions
   */
  private async fetchMaskAsDataUrl(
    maskUrl: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<string | null> {
    try {
      console.log(SelectModeLogMessage.FetchingMaskFromUrl, maskUrl)

      // Load the mask image
      const maskImg = await this.loadImage(maskUrl)

      // Create canvas with target dimensions
      const canvas = document.createElement(HtmlElementTag.Canvas)
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext(CanvasContextType.TwoD)
      if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvasForMask)

      // Draw mask scaled to target dimensions
      ctx.drawImage(maskImg, 0, 0, targetWidth, targetHeight)

      const dataUrl = canvas.toDataURL(ContentType.Png)
      console.log(SelectModeLogMessage.ConvertedMaskToDataUrl, dataUrl.length)

      return dataUrl
    } catch (error) {
      console.error(SelectModeLogMessage.ErrorFindingBestMask, error)
      return null
    }
  }

  /**
   * Resize a mask to target dimensions
   */
  private async resizeMask(
    maskDataUrl: string,
    _sourceWidth: number,
    _sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): Promise<string> {
    try {
      const maskImg = await this.loadImage(maskDataUrl)

      const canvas = document.createElement(HtmlElementTag.Canvas)
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext(CanvasContextType.TwoD)
      if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvasForResizing)

      // Draw mask scaled to target dimensions
      ctx.drawImage(maskImg, 0, 0, targetWidth, targetHeight)

      return canvas.toDataURL(ContentType.Png)
    } catch (error) {
      console.error(SelectModeLogMessage.ErrorResizingMask, error)
      throw error
    }
  }

  /**
   * Apply mask to context image to extract the segmented object with transparent background
   * Returns the data URL and the actual world bounds of the cropped asset
   */
  async extractAsset(
    contextImageUrl: string,
    maskUrl: string,
    originalBounds: { x: number; y: number; width: number; height: number }
  ): Promise<{
    dataUrl: string
    bounds: { x: number; y: number; width: number; height: number }
  }> {
    // Load both images
    const [contextImg, maskImg] = await Promise.all([
      this.loadImage(contextImageUrl),
      this.loadImage(maskUrl),
    ])

    const width = contextImg.width
    const height = contextImg.height

    // Calculate scale: how many pixels per world unit
    // The context image is at pixel dimensions, originalBounds is in world coordinates
    const scale = width / originalBounds.width

    console.log(SelectModeLogMessage.ExtractAsset, {
      imageSize: { width, height },
      originalBounds,
      scale,
    })

    // Create canvas for the context image
    const contextCanvas = document.createElement(HtmlElementTag.Canvas)
    contextCanvas.width = width
    contextCanvas.height = height
    const contextCtx = contextCanvas.getContext(CanvasContextType.TwoD)
    if (!contextCtx) throw new Error(SelectModeErrorMessage.FailedToCreateContextCanvas)
    contextCtx.drawImage(contextImg, 0, 0)
    const contextData = contextCtx.getImageData(0, 0, width, height)

    // Create canvas for the mask
    const maskCanvas = document.createElement(HtmlElementTag.Canvas)
    maskCanvas.width = width
    maskCanvas.height = height
    const maskCtx = maskCanvas.getContext(CanvasContextType.TwoD)
    if (!maskCtx) throw new Error(SelectModeErrorMessage.FailedToCreateMaskCanvas)
    maskCtx.drawImage(maskImg, 0, 0, width, height)
    const maskData = maskCtx.getImageData(0, 0, width, height)

    // Create output canvas
    const outputCanvas = document.createElement(HtmlElementTag.Canvas)
    outputCanvas.width = width
    outputCanvas.height = height
    const outputCtx = outputCanvas.getContext(CanvasContextType.TwoD)
    if (!outputCtx) throw new Error(SelectModeErrorMessage.FailedToCreateOutputCanvas)
    const outputData = outputCtx.createImageData(width, height)

    // Apply mask: copy context pixels where mask has alpha, transparent elsewhere
    for (let i = 0; i < contextData.data.length; i += 4) {
      const maskA = maskData.data[i + 3]

      // Check if mask pixel is "on" (has any alpha)
      const isMasked = maskA > 50

      if (isMasked) {
        // Copy the original pixel
        outputData.data[i] = contextData.data[i] // R
        outputData.data[i + 1] = contextData.data[i + 1] // G
        outputData.data[i + 2] = contextData.data[i + 2] // B
        outputData.data[i + 3] = 255 // A (fully opaque)
      } else {
        // Transparent
        outputData.data[i] = 0
        outputData.data[i + 1] = 0
        outputData.data[i + 2] = 0
        outputData.data[i + 3] = 0
      }
    }

    outputCtx.putImageData(outputData, 0, 0)

    // Crop to bounding box of non-transparent pixels for a tighter asset
    const cropResult = this.cropToContent(outputCanvas)

    // Convert pixel offsets to world coordinates
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

    // Return world bounds for canvas positioning
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

  /**
   * Crop canvas to the bounding box of non-transparent pixels
   * Returns both the data URL and the crop bounds offset
   */
  private cropToContent(canvas: HTMLCanvasElement): {
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

    // Find bounding box of non-transparent pixels
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

    // If no content found, return original
    if (minX > maxX || minY > maxY) {
      return {
        dataUrl: canvas.toDataURL(ContentType.Png),
        offsetX: 0,
        offsetY: 0,
        width: canvas.width,
        height: canvas.height,
      }
    }

    // Add small padding
    const padding = 2
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(width - 1, maxX + padding)
    maxY = Math.min(height - 1, maxY + padding)

    const cropWidth = maxX - minX + 1
    const cropHeight = maxY - minY + 1

    // Create cropped canvas
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
}

export const selectModeService = new SelectModeService()
