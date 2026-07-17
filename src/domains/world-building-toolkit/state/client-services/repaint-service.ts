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
  UrlScheme,
} from '../../constants/repaint-service'
import {
  collectAffectedTiles,
  compositeRepaintOntoTile,
  getTileRangeForBounds,
  loadImageFromUrl,
} from './repaint-tile-composite'

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

    const { minTileX, maxTileX, minTileY, maxTileY } = getTileRangeForBounds(
      result.bounds,
      this.TILE_SIZE
    )

    console.log(RepaintServiceLog.AffectedTiles, { minTileX, maxTileX, minTileY, maxTileY })

    const repaintImg = await loadImageFromUrl(result.imageUrl)
    const scaleX = repaintImg.width / result.bounds.width
    const scaleY = repaintImg.height / result.bounds.height

    console.log(
      `Repaint scaling: ${scaleX}x${scaleY} (Image: ${repaintImg.width}x${repaintImg.height}, Bounds: ${result.bounds.width}x${result.bounds.height})`
    )

    const affectedTiles = collectAffectedTiles(
      minTileX,
      maxTileX,
      minTileY,
      maxTileY,
      result.bounds,
      this.TILE_SIZE
    )

    affectedTiles.forEach(({ x, y }) => {
      useWorldStore.getState().addRepaintingTile(x, y)
    })

    try {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
          const tileKey = `${tileX}${TILE_COORD_SEPARATOR}${tileY}`
          const existingTile = tiles[tileKey]

          const base64 = await compositeRepaintOntoTile({
            tileX,
            tileY,
            tileSize: this.TILE_SIZE,
            bounds: result.bounds,
            repaintImg,
            scaleX,
            scaleY,
            existingTile,
            projectId: currentProject.id,
          })

          if (!base64) continue

          await addTile(tileX, tileY, existingTile?.tile_prompt || RepaintTilePrompt.Repainted, base64)
        }
      }

      affectedTiles.forEach(({ x, y }) => {
        useWorldStore.getState().removeRepaintingTile(x, y)
      })
      console.log(RepaintServiceLog.RepaintAppliedSuccessfully)
    } catch (error) {
      affectedTiles.forEach(({ x, y }) => {
        useWorldStore.getState().removeRepaintingTile(x, y)
      })
      throw error
    }
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

    const padding = brushSize / 2
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const width = maxX - minX
    const height = maxY - minY
    const expandX = Math.max(width * 0.5, 256)
    const expandY = Math.max(height * 0.5, 256)

    minX -= expandX / 2
    maxX += expandX / 2
    minY -= expandY / 2
    maxY += expandY / 2

    const bounds = {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
    }
    bounds.width = Math.ceil(bounds.width / 64) * 64
    bounds.height = Math.ceil(bounds.height / 64) * 64

    console.log(RepaintServiceLog.FinalBoundsWithExpansion, bounds)

    const canvas = document.createElement(HtmlElementTag.Canvas)
    canvas.width = bounds.width
    canvas.height = bounds.height
    const ctx = canvas.getContext(CanvasContextType.TwoD)
    if (!ctx) throw new Error(RepaintServiceError.FailedToCreateCanvas)

    ctx.fillStyle = RepaintCanvasFill.ContextGray
    ctx.fillRect(0, 0, bounds.width, bounds.height)

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

    const maskCanvas = document.createElement(HtmlElementTag.Canvas)
    maskCanvas.width = bounds.width
    maskCanvas.height = bounds.height
    const maskCtx = maskCanvas.getContext(CanvasContextType.TwoD)
    if (!maskCtx) throw new Error(RepaintServiceError.FailedToCreateMaskCanvas)

    maskCtx.fillStyle = RepaintMaskColor.Black
    maskCtx.fillRect(0, 0, bounds.width, bounds.height)

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

    useWorldStore.getState().setDebugInfo({
      image: canvas.toDataURL(RepaintImageMime.Png),
      mask: maskCanvas.toDataURL(RepaintImageMime.Png),
    })

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
