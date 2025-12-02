import { Tile } from '@/domains/world-building-toolkit/store/useWorldStore'

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
        apiResponse: any
        maskUrl?: string
        error?: string
    }
}

export class SelectModeService {
    private TILE_SIZE = 512
    private abortController: AbortController | null = null
    private currentScale = 1 // Pixels per world unit
    private currentWorldBounds: { x: number; y: number; width: number; height: number } | null = null

    private getSegmentationProvider(): 'fal' | 'replicate' {
        if (typeof window !== 'undefined') {
            const provider = localStorage.getItem('ai-segmentation-provider')
            if (provider === 'replicate') return 'replicate'
        }
        return 'fal'
    }

    private getFalApiKey(): string {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ai-config-fal')
            if (saved) {
                const config = JSON.parse(saved)
                return config.apiKey
            }
        }
        return ''
    }

    private getReplicateApiKey(): string {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ai-config-replicate')
            if (saved) {
                const config = JSON.parse(saved)
                return config.apiKey
            }
        }
        return ''
    }

    private getSamParams(): { returnMultipleMasks?: boolean; includeScores?: boolean; includeBoxes?: boolean } {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ai-config-fal')
            if (saved) {
                const config = JSON.parse(saved)
                return {
                    returnMultipleMasks: config.returnMultipleMasks,
                    includeScores: config.includeScores,
                    includeBoxes: config.includeBoxes
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

        // Add padding (e.g. half a tile)
        const PADDING = this.TILE_SIZE / 2
        const minX = boxMinX - PADDING
        const minY = boxMinY - PADDING
        const maxX = boxMaxX + PADDING
        const maxY = boxMaxY + PADDING

        // World bounds (512 units per tile)
        const worldBounds = {
            x: Math.floor(minX),
            y: Math.floor(minY),
            width: Math.ceil(maxX - minX),
            height: Math.ceil(maxY - minY)
        }
        // Ensure min size
        worldBounds.width = Math.max(worldBounds.width, 512)
        worldBounds.height = Math.max(worldBounds.height, 512)

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
                if (tile) {
                    try {
                        const pid = projectId || tile.project_id
                        const img = await this.loadImage(`/projects/${pid}/${tile.image_filename}`)
                        tileResolution = img.naturalWidth // Actual pixel size of tile
                        console.log(`[SelectModeService] Detected tile resolution: ${tileResolution}px`)
                    } catch (e) {
                        console.warn('[SelectModeService] Could not detect tile resolution')
                    }
                }
            }
        }

        // Scale factor: how many pixels per world unit
        const scale = tileResolution / this.TILE_SIZE

        // Pixel bounds (actual image dimensions)
        const pixelBounds = {
            x: worldBounds.x * scale,
            y: worldBounds.y * scale,
            width: worldBounds.width * scale,
            height: worldBounds.height * scale
        }

        console.log(`[SelectModeService] Scale: ${scale}, World bounds:`, worldBounds, 'Pixel bounds:', pixelBounds)

        // 3. Create Context Image at native resolution
        const canvas = document.createElement('canvas')
        canvas.width = pixelBounds.width
        canvas.height = pixelBounds.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to create canvas')

        // Fill with gray
        ctx.fillStyle = '#808080'
        ctx.fillRect(0, 0, pixelBounds.width, pixelBounds.height)

        const imagePromises: Promise<void>[] = []

        for (let tx = startTileX; tx <= endTileX; tx++) {
            for (let ty = startTileY; ty <= endTileY; ty++) {
                const tileKey = `${tx},${ty}`
                const tile = tiles[tileKey]

                if (tile) {
                    const pid = projectId || tile.project_id
                    const imagePath = `/projects/${pid}/${tile.image_filename}`
                    console.log(`[SelectModeService] Loading tile: ${tileKey} from ${imagePath}`)

                    const promise = this.loadImage(imagePath).then(img => {
                        // Draw at native resolution
                        const drawX = (tx * tileResolution) - pixelBounds.x
                        const drawY = (ty * tileResolution) - pixelBounds.y
                        ctx.drawImage(img, drawX, drawY, tileResolution, tileResolution)
                        console.log(`[SelectModeService] Drew tile ${tileKey} at pixel (${drawX}, ${drawY}) size ${tileResolution}`)
                    }).catch(err => {
                        console.error(`[SelectModeService] Failed to load tile ${tileKey} from ${imagePath}`, err)
                    })
                    imagePromises.push(promise)
                } else {
                    console.warn(`[SelectModeService] Tile ${tileKey} not found in store`)
                }
            }
        }

        await Promise.all(imagePromises)

        const base64Image = canvas.toDataURL('image/png')
        
        // Store scale for later use in extraction
        this.currentScale = scale

        // Store world bounds for later use
        this.currentWorldBounds = worldBounds

        console.log('[SelectModeService] Image details:', {
            width: canvas.width,
            height: canvas.height,
            worldBounds,
            pixelBounds,
            scale,
            dataUrlLength: base64Image.length,
            hasDataPrefix: base64Image.startsWith('data:')
        })

        // 3. Adjust box to be relative to the context image (in PIXEL coordinates)
        const relativeBox: SelectBox = {
            x1: (box.x1 - worldBounds.x) * scale,
            y1: (box.y1 - worldBounds.y) * scale,
            x2: (box.x2 - worldBounds.x) * scale,
            y2: (box.y2 - worldBounds.y) * scale
        }

        console.log('[SelectModeService] Calling API with:', {
            imageSize: { width: pixelBounds.width, height: pixelBounds.height },
            box: relativeBox,
            worldBounds,
            scale
        })

        let maskUrl = ''
        let apiResponse: any = null

        const provider = this.getSegmentationProvider()
        console.log('[SelectModeService] Using segmentation provider:', provider)

        // 4. Call appropriate segmentation API
        try {
            if (provider === 'replicate') {
                // Call Replicate SAM-2 API
                const data = await fetch('/api/ai/segment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        points: [], // SAM-2 auto-generates masks, points are ignored
                        apiKey: this.getReplicateApiKey()
                    }),
                    signal: this.abortController.signal
                }).then(res => res.json())

                apiResponse = data

                if (data.error) throw new Error(data.error)

                // Replicate returns mask URLs - find the best mask for the selection box
                if (data.output?.combined_mask) {
                    console.log('[SelectModeService] Got combined_mask URL:', data.output.combined_mask)
                    // Fetch the mask image and convert to data URL (at pixel dimensions)
                    maskUrl = await this.fetchMaskAsDataUrl(data.output.combined_mask, pixelBounds.width, pixelBounds.height)
                } else if (data.output?.individual_masks?.length > 0) {
                    // Find the mask that best covers the selection box
                    console.log('[SelectModeService] Got individual_masks:', data.output.individual_masks.length)
                    // For now, use the first mask - could improve by finding best overlap
                    maskUrl = await this.fetchMaskAsDataUrl(data.output.individual_masks[0], pixelBounds.width, pixelBounds.height)
                } else {
                    console.warn('[SelectModeService] No masks in Replicate response')
                }
            } else {
                // Call fal.ai SAM-3 API with bounding box
                const data = await fetch('/api/ai/fal-segment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        box: relativeBox,
                        apiKey: this.getFalApiKey(),
                        textPrompt: textPrompt,
                        samParams: this.getSamParams()
                    }),
                    signal: this.abortController.signal
                }).then(res => res.json())

                apiResponse = data

                if (data.error) throw new Error(data.error)

                // Fal.ai returns RLE-encoded masks at pixel dimensions
                if (data.output?.rle) {
                    const { rleToDataURL } = await import('../utils/rle')
                    maskUrl = rleToDataURL(data.output.rle, pixelBounds.width, pixelBounds.height)
                } else {
                    console.warn('[SelectModeService] No RLE mask in response')
                }
            }

            // Return world bounds for canvas positioning
            return {
                imageUrl: maskUrl,
                bounds: {
                    x: worldBounds.x,
                    y: worldBounds.y,
                    width: worldBounds.width,
                    height: worldBounds.height
                },
                debugInfo: {
                    contextImage: base64Image,
                    box: relativeBox,
                    apiResponse: apiResponse,
                    maskUrl,
                    scale,
                    worldBounds,
                    pixelBounds
                }
            }
        } catch (error: any) {
            console.error('[SelectModeService] Error during segmentation:', error)
            return {
                imageUrl: maskUrl,
                bounds: {
                    x: worldBounds.x,
                    y: worldBounds.y,
                    width: worldBounds.width,
                    height: worldBounds.height
                },
                debugInfo: {
                    contextImage: base64Image,
                    box: relativeBox,
                    apiResponse: apiResponse,
                    maskUrl,
                    error: error.message || String(error)
                }
            }
        }
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            if (url.startsWith('http')) {
                img.crossOrigin = 'Anonymous'
            }
            img.onload = () => resolve(img)
            img.onerror = (e) => reject(new Error(`Failed to load image at ${url}: ${e}`))
            img.src = url
        })
    }

    /**
     * Fetch a remote mask image URL and convert it to a data URL
     * Resizes to match the context image dimensions
     */
    private async fetchMaskAsDataUrl(maskUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
        try {
            console.log('[SelectModeService] Fetching mask from URL:', maskUrl)
            
            // Load the mask image
            const maskImg = await this.loadImage(maskUrl)
            
            // Create canvas with target dimensions
            const canvas = document.createElement('canvas')
            canvas.width = targetWidth
            canvas.height = targetHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Failed to create canvas for mask')
            
            // Draw mask scaled to target dimensions
            ctx.drawImage(maskImg, 0, 0, targetWidth, targetHeight)
            
            const dataUrl = canvas.toDataURL('image/png')
            console.log('[SelectModeService] Converted mask to data URL, length:', dataUrl.length)
            
            return dataUrl
        } catch (error) {
            console.error('[SelectModeService] Failed to fetch mask:', error)
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
            this.loadImage(maskUrl)
        ])

        const width = contextImg.width
        const height = contextImg.height
        
        // Calculate scale: how many pixels per world unit
        // The context image is at pixel dimensions, originalBounds is in world coordinates
        const scale = width / originalBounds.width

        console.log('[SelectModeService] extractAsset:', {
            imageSize: { width, height },
            originalBounds,
            scale
        })

        // Create canvas for the context image
        const contextCanvas = document.createElement('canvas')
        contextCanvas.width = width
        contextCanvas.height = height
        const contextCtx = contextCanvas.getContext('2d')
        if (!contextCtx) throw new Error('Failed to create context canvas')
        contextCtx.drawImage(contextImg, 0, 0)
        const contextData = contextCtx.getImageData(0, 0, width, height)

        // Create canvas for the mask
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = width
        maskCanvas.height = height
        const maskCtx = maskCanvas.getContext('2d')
        if (!maskCtx) throw new Error('Failed to create mask canvas')
        maskCtx.drawImage(maskImg, 0, 0, width, height)
        const maskData = maskCtx.getImageData(0, 0, width, height)

        // Create output canvas
        const outputCanvas = document.createElement('canvas')
        outputCanvas.width = width
        outputCanvas.height = height
        const outputCtx = outputCanvas.getContext('2d')
        if (!outputCtx) throw new Error('Failed to create output canvas')
        const outputData = outputCtx.createImageData(width, height)

        // Apply mask: copy context pixels where mask has alpha, transparent elsewhere
        for (let i = 0; i < contextData.data.length; i += 4) {
            const maskA = maskData.data[i + 3]

            // Check if mask pixel is "on" (has any alpha)
            const isMasked = maskA > 50

            if (isMasked) {
                // Copy the original pixel
                outputData.data[i] = contextData.data[i]         // R
                outputData.data[i + 1] = contextData.data[i + 1] // G
                outputData.data[i + 2] = contextData.data[i + 2] // B
                outputData.data[i + 3] = 255                      // A (fully opaque)
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

        console.log('[SelectModeService] cropResult:', {
            pixelOffset: { x: cropResult.offsetX, y: cropResult.offsetY },
            pixelSize: { w: cropResult.width, h: cropResult.height },
            worldOffset: { x: worldOffsetX, y: worldOffsetY },
            worldSize: { w: worldWidth, h: worldHeight }
        })

        // Return world bounds for canvas positioning
        return {
            dataUrl: cropResult.dataUrl,
            bounds: {
                x: originalBounds.x + worldOffsetX,
                y: originalBounds.y + worldOffsetY,
                width: worldWidth,
                height: worldHeight
            }
        }
    }

    /**
     * Crop canvas to the bounding box of non-transparent pixels
     * Returns both the data URL and the crop bounds offset
     */
    private cropToContent(canvas: HTMLCanvasElement): { dataUrl: string; offsetX: number; offsetY: number; width: number; height: number } {
        const ctx = canvas.getContext('2d')
        if (!ctx) return { dataUrl: canvas.toDataURL('image/png'), offsetX: 0, offsetY: 0, width: canvas.width, height: canvas.height }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data, width, height } = imageData

        let minX = width, minY = height, maxX = 0, maxY = 0

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
            return { dataUrl: canvas.toDataURL('image/png'), offsetX: 0, offsetY: 0, width: canvas.width, height: canvas.height }
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
        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = cropWidth
        croppedCanvas.height = cropHeight
        const croppedCtx = croppedCanvas.getContext('2d')
        if (!croppedCtx) return { dataUrl: canvas.toDataURL('image/png'), offsetX: 0, offsetY: 0, width: canvas.width, height: canvas.height }

        croppedCtx.drawImage(
            canvas,
            minX, minY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        )

        return {
            dataUrl: croppedCanvas.toDataURL('image/png'),
            offsetX: minX,
            offsetY: minY,
            width: cropWidth,
            height: cropHeight
        }
    }
}

export const selectModeService = new SelectModeService()
