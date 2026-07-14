import type { Tile } from '../../core/world-types'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  ContentType,
  DATA_URL_PNG_PREFIX,
  HtmlElementTag,
  CanvasContextType,
  HttpHeaderName,
  HttpMethod,
  ImageCrossOrigin,
  SegmentationProvider,
  SelectModeApiRoute,
  SelectModeCanvasFill,
  SelectModeErrorMessage,
  SelectModeLogLabel,
  SelectModeLogMessage,
  SelectModePixelSample,
  UrlScheme,
} from '../../constants/select-mode-service'

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
    if (typeof window !== 'undefined') {
      const provider = localStorage.getItem(LocalStorageKeys.AI_SEGMENTATION_PROVIDER)
      if (provider === SegmentationProvider.Replicate) return SegmentationProvider.Replicate
    }
    return SegmentationProvider.Fal
  }

  private getFalApiKey(): string {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LocalStorageKeys.AI_CONFIG_FAL)
      if (saved) {
        const config = JSON.parse(saved)
        return config.apiKey
      }
    }
    return ''
  }

  private getReplicateApiKey(): string {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LocalStorageKeys.AI_CONFIG_REPLICATE)
      if (saved) {
        const config = JSON.parse(saved)
        return config.apiKey
      }
    }
    return ''
  }

  private getSamParams(): {
    returnMultipleMasks?: boolean
    includeScores?: boolean
    includeBoxes?: boolean
  } {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LocalStorageKeys.AI_CONFIG_FAL)
      if (saved) {
        const config = JSON.parse(saved)
        return {
          returnMultipleMasks: config.returnMultipleMasks,
          includeScores: config.includeScores,
          includeBoxes: config.includeBoxes,
        }
      }
    }
    return {}
  }

  async segmentObject(
    box: SelectBox,
    tiles: Record<string, Tile>,
    projectId: string,
    textPrompt?: string
  ): Promise<SelectResult> {
    // Abort previous request
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    // 1. Calculate bounds from box with padding (in world coordinates)
    const boxMinX = Math.min(box.x1, box.x2)
    const boxMinY = Math.min(box.y1, box.y2)
    const boxMaxX = Math.max(box.x1, box.x2)
    const boxMaxY = Math.max(box.y1, box.y2)

    // Add minimal padding - just enough for edge context
    const PADDING = 32 // Small padding to avoid cutting off edges
    const minX = boxMinX - PADDING
    const minY = boxMinY - PADDING
    const maxX = boxMaxX + PADDING
    const maxY = boxMaxY + PADDING

    // World bounds (512 units per tile)
    const worldBounds = {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
    }
    // Ensure minimum size (smaller - just needs to contain selection)
    worldBounds.width = Math.max(worldBounds.width, 128)
    worldBounds.height = Math.max(worldBounds.height, 128)

    // 2. Detect tile resolution by loading first available tile
    const startTileX = Math.floor(worldBounds.x / this.TILE_SIZE)
    const startTileY = Math.floor(worldBounds.y / this.TILE_SIZE)
    const endTileX = Math.floor((worldBounds.x + worldBounds.width) / this.TILE_SIZE)
    const endTileY = Math.floor((worldBounds.y + worldBounds.height) / this.TILE_SIZE)

    // Find first tile to determine resolution
    let tileResolution = this.TILE_SIZE // Default to 512
    for (let tx = startTileX; tx <= endTileX && tileResolution === this.TILE_SIZE; tx++) {
      for (let ty = startTileY; ty <= endTileY && tileResolution === this.TILE_SIZE; ty++) {
        const tile = tiles[`${tx},${ty}`]
        if (tile?.image_filename) {
          try {
            const pid = projectId || tile.project_id
            const imgUrl = tile.image_filename.startsWith(UrlScheme.Http) ? tile.image_filename : `/projects/${pid}/${tile.image_filename}`
            const img = await this.loadImage(imgUrl)
            tileResolution = img.naturalWidth // Actual pixel size of tile
            console.log(`[SelectModeService] Detected tile resolution: ${tileResolution}px`)
          } catch (e) {
            console.warn(SelectModeLogMessage.CouldNotDetectTileResolution)
          }
        }
      }
    }

    // Scale factor: how many pixels per world unit
    const scale = tileResolution / this.TILE_SIZE

    // Pixel bounds (actual image dimensions) - Force alignment to integers AND multiples of 32
    // Stricter alignment (32px) is safer for AI tensor operations to avoid stride/skew issues
    let rawWidth = Math.round(worldBounds.width * scale)
    let rawHeight = Math.round(worldBounds.height * scale)

    // IMPORTANT: Limit max canvas size to prevent huge base64 payloads
    // fal.ai and most APIs struggle with images > 4096px or > 5MB
    const MAX_DIMENSION = 2048
    let effectiveScale = scale

    if (rawWidth > MAX_DIMENSION || rawHeight > MAX_DIMENSION) {
      const downscaleFactor = Math.max(rawWidth, rawHeight) / MAX_DIMENSION
      console.log(
        `[SelectModeService] Canvas too large (${rawWidth}x${rawHeight}), downscaling by ${downscaleFactor.toFixed(2)}x`
      )

      effectiveScale = scale / downscaleFactor
      rawWidth = Math.round(worldBounds.width * effectiveScale)
      rawHeight = Math.round(worldBounds.height * effectiveScale)
    }

    // Ensure dimensions are multiples of 32
    const alignedWidth = rawWidth + ((32 - (rawWidth % 32)) % 32)
    const alignedHeight = rawHeight + ((32 - (rawHeight % 32)) % 32)

    // Log canvas dimensions for debugging
    console.log(SelectModeLogMessage.CanvasDimensions, {
      rawWidth,
      rawHeight,
      alignedWidth,
      alignedHeight,
      tileResolution,
      originalScale: scale,
      effectiveScale,
    })

    // Use effective scale for all subsequent calculations
    const finalScale = effectiveScale

    const pixelBounds = {
      x: Math.round(worldBounds.x * finalScale),
      y: Math.round(worldBounds.y * finalScale),
      width: alignedWidth,
      height: alignedHeight,
    }

    // Calculate effective tile size at this scale
    const effectiveTileSize = Math.round(this.TILE_SIZE * finalScale)

    console.log(
      `[SelectModeService] Scale: ${finalScale} (original: ${scale}), World bounds:`,
      worldBounds,
      SelectModeLogLabel.PixelBounds,
      pixelBounds,
      SelectModeLogLabel.EffectiveTileSize,
      effectiveTileSize
    )

    // 3. Create Context Image at native resolution
    const canvas = document.createElement(HtmlElementTag.Canvas)
    canvas.width = pixelBounds.width
    canvas.height = pixelBounds.height
    const ctx = canvas.getContext(CanvasContextType.TwoD)
    if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvas)

    // Fill with gray (debug background)
    ctx.fillStyle = SelectModeCanvasFill.DebugGray
    ctx.fillRect(0, 0, pixelBounds.width, pixelBounds.height)

    console.log(SelectModeLogMessage.CanvasCreated, {
      width: canvas.width,
      height: canvas.height,
      pixelBounds,
    })

    const imagePromises: Promise<void>[] = []

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const tileKey = `${tx},${ty}`
        const tile = tiles[tileKey]

        if (tile?.image_filename) {
          const pid = projectId || tile.project_id
          const imagePath = tile.image_filename.startsWith(UrlScheme.Http) ? tile.image_filename : `/projects/${pid}/${tile.image_filename}`

          const promise = this.loadImage(imagePath)
            .then(img => {
              // Draw at effective scale (may be downscaled from native resolution)
              const drawX = Math.round(tx * effectiveTileSize - pixelBounds.x)
              const drawY = Math.round(ty * effectiveTileSize - pixelBounds.y)

              console.log(`[SelectModeService] Drawing tile ${tileKey}:`, {
                tx,
                ty,
                effectiveTileSize,
                drawX,
                drawY,
                imageSize: { w: img.width, h: img.height },
              })

              // Draw the FULL source image scaled to effective tile size
              // This ensures proper scaling regardless of the actual image resolution
              ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height, // Source: full image
                drawX,
                drawY,
                effectiveTileSize,
                effectiveTileSize // Dest: scaled to effective size
              )
            })
            .catch(err => {
              console.error(
                `[SelectModeService] Failed to load tile ${tileKey} from ${imagePath}`,
                err
              )
            })
          imagePromises.push(promise)
        } else {
          console.warn(`[SelectModeService] Tile ${tileKey} not found in store`)
        }
      }
    }

    await Promise.all(imagePromises)

    // Verify canvas state before converting to base64
    console.log(SelectModeLogMessage.CanvasStateBeforeToDataUrl, {
      width: canvas.width,
      height: canvas.height,
      contextLost: ctx.isContextLost?.() ?? 'N/A',
    })

    // DEBUG: Sample pixels at multiple points to verify canvas content
    // Gray [128,128,128,255] = no tile loaded, Black [0,0,0,0] = transparency issue
    const samples = [
      { name: SelectModePixelSample.TopLeft, x: 10, y: 10 },
      { name: SelectModePixelSample.TopRight, x: canvas.width - 10, y: 10 },
      { name: SelectModePixelSample.Center, x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) },
      { name: SelectModePixelSample.BottomLeft, x: 10, y: canvas.height - 10 },
      { name: SelectModePixelSample.BottomRight, x: canvas.width - 10, y: canvas.height - 10 },
    ]
    const pixelSamples: Record<string, number[]> = {}
    samples.forEach(s => {
      const pixel = ctx.getImageData(s.x, s.y, 1, 1).data
      pixelSamples[s.name] = Array.from(pixel)
    })
    console.log(SelectModeLogMessage.DebugCanvasPixelSamples, pixelSamples)

    const base64Image = canvas.toDataURL(ContentType.Png)

    // DEBUG: Store image in window for easy console access
    // To view: type window.__DEBUG_CONTEXT_IMAGE__ in console, right-click result, open in new tab
    window.__DEBUG_CONTEXT_IMAGE__ = base64Image
    console.log(SelectModeLogMessage.DebugContextImageStored)
    console.log(SelectModeLogMessage.DebugContextImageViewHint)

    // Verify the base64 output is properly formed
    const expectedPrefix = DATA_URL_PNG_PREFIX
    const isValidPrefix = base64Image.startsWith(expectedPrefix)
    const base64Data = base64Image.slice(expectedPrefix.length)
    const isValidBase64Length = base64Data.length > 0 && base64Data.length % 4 === 0

    console.log(SelectModeLogMessage.Base64Validation, {
      totalLength: base64Image.length,
      base64DataLength: base64Data.length,
      isValidPrefix,
      isValidBase64Length,
      estimatedSizeMB: ((base64Data.length * 0.75) / 1024 / 1024).toFixed(2),
      // Check for truncation by looking at end of base64
      ending: base64Image.slice(-20),
    })

    if (!isValidPrefix || !isValidBase64Length) {
      console.error(SelectModeLogMessage.Base64MalformedWarning)
    }

    // Store effective scale and world bounds for debugging context in logs below
    console.log(SelectModeLogMessage.ImageDetails, {
      width: canvas.width,
      height: canvas.height,
      worldBounds,
      pixelBounds,
      scale: finalScale,
      dataUrlLength: base64Image.length,
      hasDataPrefix: base64Image.startsWith(UrlScheme.Data),
    })

    // 3. Adjust box to be relative to the context image (in PIXEL coordinates)
    // Use finalScale (which may be downscaled) for the box coordinates
    const relativeBox: SelectBox = {
      x1: (box.x1 - worldBounds.x) * finalScale,
      y1: (box.y1 - worldBounds.y) * finalScale,
      x2: (box.x2 - worldBounds.x) * finalScale,
      y2: (box.y2 - worldBounds.y) * finalScale,
    }

    console.log(SelectModeLogMessage.BoxTransformation, {
      originalBox: box,
      worldBoundsOrigin: { x: worldBounds.x, y: worldBounds.y },
      finalScale,
      relativeBox,
      boxSizeInPixels: {
        width: Math.abs(relativeBox.x2 - relativeBox.x1),
        height: Math.abs(relativeBox.y2 - relativeBox.y1),
      },
      canvasSize: { width: pixelBounds.width, height: pixelBounds.height },
    })

    console.log(SelectModeLogMessage.CallingApiWith, {
      imageSize: { width: pixelBounds.width, height: pixelBounds.height },
      box: relativeBox,
      worldBounds,
      scale: finalScale,
    })

    let maskUrl = ''
    let apiResponse: unknown = null

    const provider = this.getSegmentationProvider()
    console.log(SelectModeLogMessage.UsingSegmentationProvider, provider)

    // 4. Call appropriate segmentation API
    try {
      if (provider === SegmentationProvider.Replicate) {
        // Call Replicate SAM-2 API
        const data = await fetch(SelectModeApiRoute.Segment, {
          method: HttpMethod.Post,
          headers: { [HttpHeaderName.ContentType]: ContentType.Json },
          body: JSON.stringify({
            image: base64Image,
            points: [], // SAM-2 auto-generates masks, points are ignored
            apiKey: this.getReplicateApiKey(),
          }),
          signal: this.abortController.signal,
        }).then(res => res.json())

        apiResponse = data

        if (data.error) throw new Error(data.error)

        // Replicate returns mask URLs - find the best mask for the selection box
        if (data.output?.combined_mask) {
          console.log(SelectModeLogMessage.GotCombinedMaskUrl, data.output.combined_mask)
          // Fetch the mask image and convert to data URL (at pixel dimensions)
          const fetchedMask = await this.fetchMaskAsDataUrl(
            data.output.combined_mask,
            pixelBounds.width,
            pixelBounds.height
          )
          if (fetchedMask) maskUrl = fetchedMask
        } else if (data.output?.individual_masks?.length > 0) {
          // Find the mask that best covers the selection box
          console.log(
            SelectModeLogMessage.GotIndividualMasks,
            data.output.individual_masks.length
          )
          // For now, use the first mask - could improve by finding best overlap
          const fetchedMask = await this.fetchMaskAsDataUrl(
            data.output.individual_masks[0],
            pixelBounds.width,
            pixelBounds.height
          )
          if (fetchedMask) maskUrl = fetchedMask
        } else {
          console.warn(SelectModeLogMessage.NoMasksInReplicateResponse)
        }
      } else {
        // Call fal.ai SAM-3 API with bounding box
        const data = await fetch(SelectModeApiRoute.FalSegment, {
          method: HttpMethod.Post,
          headers: { [HttpHeaderName.ContentType]: ContentType.Json },
          body: JSON.stringify({
            image: base64Image,
            box: relativeBox,
            apiKey: this.getFalApiKey(),
            textPrompt: textPrompt,
            samParams: this.getSamParams(),
          }),
          signal: this.abortController.signal,
        }).then(res => res.json())

        apiResponse = data

        if (data.error) throw new Error(data.error)

        // Fal.ai returns RLE-encoded masks
        if (data.output?.rle) {
          // Extract dimensions from API response - fal.ai includes width/height
          // Ensure we use integers for mask dimensions to avoid ImageData errors
          const maskWidth = data.output.width || Math.round(pixelBounds.width)
          const maskHeight = data.output.height || Math.round(pixelBounds.height)

          console.log(SelectModeLogMessage.RleDimensions, {
            fromAPI: { width: data.output.width, height: data.output.height },
            expected: { width: pixelBounds.width, height: pixelBounds.height },
            using: { width: maskWidth, height: maskHeight },
          })

          const { rleToDataURL } = await import('../../core/rle')
          const maskDataUrl = rleToDataURL(data.output.rle, maskWidth, maskHeight)

          // If the mask dimensions don't match our expected pixel bounds, we need to resize
          if (maskWidth !== pixelBounds.width || maskHeight !== pixelBounds.height) {
            console.log(SelectModeLogMessage.ResizingMaskToPixelBounds)
            const resizedMask = await this.resizeMask(
              maskDataUrl,
              maskWidth,
              maskHeight,
              pixelBounds.width,
              pixelBounds.height
            )
            maskUrl = resizedMask
          } else {
            maskUrl = maskDataUrl
          }
        } else {
          console.warn(SelectModeLogMessage.NoRleMaskInResponse)
        }
      }

      // Return world bounds for canvas positioning
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
          apiResponse: apiResponse,
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
          apiResponse: apiResponse,
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
