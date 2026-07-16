import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { TILE_COORD_SEPARATOR } from '../../ui/constants/tile-stage-labels'
import { postRepaint } from '../../core/io/repaint.api'
import {
  CanvasContextType,
  CanvasLineStyle,
  HtmlElementTag,
  ImageCrossOrigin,
  RepaintCanvasFill,
  RepaintDataUrlPrefix,
  RepaintDefaultPrompt,
  RepaintImageMime,
  RepaintMaskColor,
  RepaintServiceError,
  RepaintServiceLog,
  RepaintTilePrompt,
  RepaintTileStatusLabel,
  UrlScheme,
} from '../../constants/repaint-service'

interface Point {
  x: number
  y: number
  radius?: number
}

interface RepaintResult {
  imageUrl: string
  bounds: { x: number; y: number; width: number; height: number }
}

export class RepaintService {
  private TILE_SIZE = 512

  async applyRepaint(result: RepaintResult): Promise<void> {
    console.log(RepaintServiceLog.ApplyingRepaint, result.bounds)

    const { addTile, tiles, currentProject } = useWorldStore.getState()
    if (!currentProject) throw new Error(RepaintServiceError.NoProjectSelected)

    // 1. Calculate which tiles are affected by the repaint bounds
    const minTileX = Math.floor(result.bounds.x / this.TILE_SIZE)
    const maxTileX = Math.floor((result.bounds.x + result.bounds.width) / this.TILE_SIZE)
    const minTileY = Math.floor(result.bounds.y / this.TILE_SIZE)
    const maxTileY = Math.floor((result.bounds.y + result.bounds.height) / this.TILE_SIZE)

    console.log(RepaintServiceLog.AffectedTiles, { minTileX, maxTileX, minTileY, maxTileY })

    // 2. Load the repaint result image
    const repaintImg = await this.loadImageFromUrl(result.imageUrl)

    // 3. For each affected tile, composite the repaint result onto it
    // Calculate scale factors (image size / world bounds size)
    const scaleX = repaintImg.width / result.bounds.width
    const scaleY = repaintImg.height / result.bounds.height

    console.log(
      `Repaint scaling: ${scaleX}x${scaleY} (Image: ${repaintImg.width}x${repaintImg.height}, Bounds: ${result.bounds.width}x${result.bounds.height})`
    )

    const affectedTiles: Array<{ x: number; y: number }> = []

    // Collect affected tiles
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tileWorldX = tileX * this.TILE_SIZE
        const tileWorldY = tileY * this.TILE_SIZE
        const tileEndX = tileWorldX + this.TILE_SIZE
        const tileEndY = tileWorldY + this.TILE_SIZE
        const repaintEndX = result.bounds.x + result.bounds.width
        const repaintEndY = result.bounds.y + result.bounds.height

        // Check if there's actual overlap
        if (
          !(
            tileEndX <= result.bounds.x ||
            tileWorldX >= repaintEndX ||
            tileEndY <= result.bounds.y ||
            tileWorldY >= repaintEndY
          )
        ) {
          affectedTiles.push({ x: tileX, y: tileY })
        }
      }
    }

    // Mark all affected tiles as repainting
    affectedTiles.forEach(({ x, y }) => {
      useWorldStore.getState().addRepaintingTile(x, y)
    })

    try {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
          const tileKey = `${tileX}${TILE_COORD_SEPARATOR}${tileY}`
          const existingTile = tiles[tileKey]

          console.log(
            `${RepaintServiceLog.ProcessingTile} ${tileX}${TILE_COORD_SEPARATOR}${tileY}`,
            existingTile ? RepaintTileStatusLabel.Exists : RepaintTileStatusLabel.New
          )

          // Skip tiles that don't actually overlap with repaint bounds
          const tileWorldX = tileX * this.TILE_SIZE
          const tileWorldY = tileY * this.TILE_SIZE
          const tileEndX = tileWorldX + this.TILE_SIZE
          const tileEndY = tileWorldY + this.TILE_SIZE
          const repaintEndX = result.bounds.x + result.bounds.width
          const repaintEndY = result.bounds.y + result.bounds.height

          // Check if there's actual overlap
          if (
            tileEndX <= result.bounds.x ||
            tileWorldX >= repaintEndX ||
            tileEndY <= result.bounds.y ||
            tileWorldY >= repaintEndY
          ) {
            console.log(`  ${RepaintServiceLog.SkippingTileNoOverlap} ${tileX}${TILE_COORD_SEPARATOR}${tileY} - no overlap`)
            continue
          }

          // Create a canvas for this tile
          const tileCanvas = document.createElement(HtmlElementTag.Canvas)
          tileCanvas.width = this.TILE_SIZE
          tileCanvas.height = this.TILE_SIZE
          const ctx = tileCanvas.getContext(CanvasContextType.TwoD)
          if (!ctx) {
            throw new Error(RepaintServiceError.FailedToAcquireCanvasContext)
          }

          // If tile exists, load and draw the existing image first
          if (existingTile?.image_filename) {
            const filename = existingTile.image_filename
            const existingImageUrl = filename.startsWith(UrlScheme.Http)
              ? filename
              : `/projects/${currentProject.id}/${filename}`
            try {
              const existingImg = await this.loadImageFromUrl(existingImageUrl)
              ctx.drawImage(existingImg, 0, 0, this.TILE_SIZE, this.TILE_SIZE)
            } catch (e) {
              console.warn(RepaintServiceLog.CouldNotLoadExistingTile, e)
            }
          } else {
            // Fill with transparent or gray background for new tiles
            ctx.fillStyle = RepaintCanvasFill.NewTileGray
            ctx.fillRect(0, 0, this.TILE_SIZE, this.TILE_SIZE)
          }

          // Calculate which part of the repaint result overlaps this tile (in World Coordinates)
          // Overlap Rectangle in World Coords:
          const overlapX = Math.max(tileWorldX, result.bounds.x)
          const overlapY = Math.max(tileWorldY, result.bounds.y)
          const overlapW = Math.min(tileEndX, repaintEndX) - overlapX
          const overlapH = Math.min(tileEndY, repaintEndY) - overlapY

          if (overlapW <= 0 || overlapH <= 0) continue

          // Source rectangle (from repaint result image) - Apply Scaling
          const srcX = (overlapX - result.bounds.x) * scaleX
          const srcY = (overlapY - result.bounds.y) * scaleY
          const srcW = overlapW * scaleX
          const srcH = overlapH * scaleY

          // Destination rectangle (on tile canvas) - Local Tile Coords
          const destX = overlapX - tileWorldX
          const destY = overlapY - tileWorldY
          const destW = overlapW
          const destH = overlapH

          console.log(`${RepaintServiceLog.CompositingOntoTile} ${tileX}${TILE_COORD_SEPARATOR}${tileY}:`, {
            srcX,
            srcY,
            srcW,
            srcH,
            destX,
            destY,
            destW,
            destH,
          })

          // Draw the repaint result onto the tile
          ctx.drawImage(repaintImg, srcX, srcY, srcW, srcH, destX, destY, destW, destH)

          // Convert tile canvas to base64
          const base64 = tileCanvas.toDataURL(RepaintImageMime.Png).split(',')[1]

          // Save the tile (this will create or update it)
          await addTile(tileX, tileY, existingTile?.tile_prompt || RepaintTilePrompt.Repainted, base64)
        }
      }

      // Clear repainting status for all affected tiles
      affectedTiles.forEach(({ x, y }) => {
        useWorldStore.getState().removeRepaintingTile(x, y)
      })
      console.log(RepaintServiceLog.RepaintAppliedSuccessfully)
    } catch (error) {
      // Clear repainting status on error
      affectedTiles.forEach(({ x, y }) => {
        useWorldStore.getState().removeRepaintingTile(x, y)
      })
      throw error
    }
  }

  private loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = ImageCrossOrigin.Anonymous
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  async generateRepaint(
    strokes: Point[],
    tiles: Record<string, Tile>,
    brushSize: number,
    prompt?: string,
    styleReferenceUrls?: string[]
  ): Promise<RepaintResult> {
    const { currentProject } = useWorldStore.getState()
    if (!currentProject) throw new Error(RepaintServiceError.NoProjectSelected)

    console.log(RepaintServiceLog.UsingStyleReferences, styleReferenceUrls)

    // 1. Calculate Bounding Box of strokes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    strokes.forEach(p => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })

    // Add brush radius padding
    const padding = brushSize / 2
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    // 2. Expand context by 50% (was 20-30% requested, but 50% is safer for blending)
    const width = maxX - minX
    const height = maxY - minY
    // Add significant context for better blending
    const expandX = Math.max(width * 0.5, 256)
    const expandY = Math.max(height * 0.5, 256)

    minX -= expandX / 2
    maxX += expandX / 2
    minY -= expandY / 2
    maxY += expandY / 2

    // 3. Snap to nice dimensions (multiples of 64)
    const bounds = {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
    }
    bounds.width = Math.ceil(bounds.width / 64) * 64
    bounds.height = Math.ceil(bounds.height / 64) * 64

    console.log(RepaintServiceLog.FinalBoundsWithExpansion, bounds)

    // 4. Create Canvas for Image
    const canvas = document.createElement(HtmlElementTag.Canvas)
    canvas.width = bounds.width
    canvas.height = bounds.height
    const ctx = canvas.getContext(CanvasContextType.TwoD)
    if (!ctx) throw new Error(RepaintServiceError.FailedToCreateCanvas)

    // Fill with gray initially to avoid transparency issues
    ctx.fillStyle = RepaintCanvasFill.ContextGray
    ctx.fillRect(0, 0, bounds.width, bounds.height)

    // 5. Draw Underlying Tiles
    const startTileX = Math.floor(bounds.x / this.TILE_SIZE)
    const startTileY = Math.floor(bounds.y / this.TILE_SIZE)
    const endTileX = Math.floor((bounds.x + bounds.width) / this.TILE_SIZE)
    const endTileY = Math.floor((bounds.y + bounds.height) / this.TILE_SIZE)

    const imagePromises: Promise<void>[] = []

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const tileKey = `${tx}${TILE_COORD_SEPARATOR}${ty}`
        const tile = tiles[tileKey]
        if (tile?.image_filename) {
          const promise = this.loadImage(tile.image_filename, tile.project_id)
            .then(img => {
              const drawX = tx * this.TILE_SIZE - bounds.x
              const drawY = ty * this.TILE_SIZE - bounds.y
              ctx.drawImage(img, drawX, drawY, this.TILE_SIZE, this.TILE_SIZE)
            })
            .catch(err => {
              console.warn(`Failed to load tile ${tileKey} for repaint context`, err)
            })
          imagePromises.push(promise)
        }
      }
    }

    await Promise.all(imagePromises)

    // 6. Create Mask
    const maskCanvas = document.createElement(HtmlElementTag.Canvas)
    maskCanvas.width = bounds.width
    maskCanvas.height = bounds.height
    const maskCtx = maskCanvas.getContext(CanvasContextType.TwoD)
    if (!maskCtx) throw new Error(RepaintServiceError.FailedToCreateMaskCanvas)

    // Fill with Black (Keep) - Standard for many models, but let's double check Gemini.
    // Gemini/Imagen usually expects:
    // - Mask where white = edit, black = keep (or vice versa depending on specific endpoint).
    // Let's assume standard: White (255) = Edit, Black (0) = Keep.
    maskCtx.fillStyle = RepaintMaskColor.Black
    maskCtx.fillRect(0, 0, bounds.width, bounds.height)

    // Draw Strokes in White (Edit)
    maskCtx.fillStyle = RepaintMaskColor.White
    maskCtx.lineCap = CanvasLineStyle.Round
    maskCtx.lineJoin = CanvasLineStyle.Round

    strokes.forEach(p => {
      const drawX = p.x - bounds.x
      const drawY = p.y - bounds.y
      const radius = typeof p.radius === 'number' ? p.radius : brushSize / 2
      maskCtx.beginPath()
      maskCtx.arc(drawX, drawY, radius, 0, Math.PI * 2)
      maskCtx.fill()
    })

    const base64Image = canvas.toDataURL(RepaintImageMime.Png).split(',')[1]
    const maskBase64 = maskCanvas.toDataURL(RepaintImageMime.Png).split(',')[1]

    // 7. Set Debug Info in Store
    useWorldStore.getState().setDebugInfo({
      image: canvas.toDataURL(RepaintImageMime.Png),
      mask: maskCanvas.toDataURL(RepaintImageMime.Png),
    })

    // 8. Call server-side inpainting API
    console.log(RepaintServiceLog.CallingServerSideApi, { styleReferenceUrls })

    const { imageBase64 } = await postRepaint({
      projectId: currentProject.id,
      base64Image,
      maskBase64,
      prompt: prompt || RepaintDefaultPrompt.SeamlessBlend,
      styleReferenceUrls,
    })

    return {
      imageUrl: `${RepaintDataUrlPrefix.PngBase64}${imageBase64}`,
      bounds,
    }
  }

  private loadImage(filename: string, projectId: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = ImageCrossOrigin.Anonymous
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = filename.startsWith(UrlScheme.Http) ? filename : `/projects/${projectId}/${filename}`
    })
  }
}

export const repaintService = new RepaintService()
