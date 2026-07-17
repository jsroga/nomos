import type { Tile } from '../../core/world-types'
import { TILE_COORD_SEPARATOR } from '../../ui/constants/tile-stage-labels'
import {
  CanvasContextType,
  HtmlElementTag,
  ImageCrossOrigin,
  RepaintCanvasFill,
  RepaintImageMime,
  RepaintServiceError,
  RepaintServiceLog,
  RepaintTileStatusLabel,
  UrlScheme,
} from '../../constants/repaint-service'

export interface RepaintBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface TileCoord {
  x: number
  y: number
}

export function getTileRangeForBounds(bounds: RepaintBounds, tileSize: number) {
  return {
    minTileX: Math.floor(bounds.x / tileSize),
    maxTileX: Math.floor((bounds.x + bounds.width) / tileSize),
    minTileY: Math.floor(bounds.y / tileSize),
    maxTileY: Math.floor((bounds.y + bounds.height) / tileSize),
  }
}

export function tileOverlapsRepaintBounds(
  tileX: number,
  tileY: number,
  tileSize: number,
  bounds: RepaintBounds
): boolean {
  const tileWorldX = tileX * tileSize
  const tileWorldY = tileY * tileSize
  const tileEndX = tileWorldX + tileSize
  const tileEndY = tileWorldY + tileSize
  const repaintEndX = bounds.x + bounds.width
  const repaintEndY = bounds.y + bounds.height

  return !(
    tileEndX <= bounds.x ||
    tileWorldX >= repaintEndX ||
    tileEndY <= bounds.y ||
    tileWorldY >= repaintEndY
  )
}

export function collectAffectedTiles(
  minTileX: number,
  maxTileX: number,
  minTileY: number,
  maxTileY: number,
  bounds: RepaintBounds,
  tileSize: number
): TileCoord[] {
  const affectedTiles: TileCoord[] = []

  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      if (tileOverlapsRepaintBounds(tileX, tileY, tileSize, bounds)) {
        affectedTiles.push({ x: tileX, y: tileY })
      }
    }
  }

  return affectedTiles
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = ImageCrossOrigin.Anonymous
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function resolveExistingTileImageUrl(
  filename: string,
  projectId: string
): string {
  return filename.startsWith(UrlScheme.Http)
    ? filename
    : `/projects/${projectId}/${filename}`
}

async function drawExistingTileBackground(
  ctx: CanvasRenderingContext2D,
  existingTile: Tile | undefined,
  projectId: string,
  tileSize: number
): Promise<void> {
  if (existingTile?.image_filename) {
    const existingImageUrl = resolveExistingTileImageUrl(
      existingTile.image_filename,
      projectId
    )
    try {
      const existingImg = await loadImageFromUrl(existingImageUrl)
      ctx.drawImage(existingImg, 0, 0, tileSize, tileSize)
    } catch (e) {
      console.warn(RepaintServiceLog.CouldNotLoadExistingTile, e)
    }
    return
  }

  ctx.fillStyle = RepaintCanvasFill.NewTileGray
  ctx.fillRect(0, 0, tileSize, tileSize)
}

function drawRepaintOverlap(
  ctx: CanvasRenderingContext2D,
  repaintImg: HTMLImageElement,
  tileX: number,
  tileY: number,
  tileSize: number,
  bounds: RepaintBounds,
  scaleX: number,
  scaleY: number
): void {
  const tileWorldX = tileX * tileSize
  const tileWorldY = tileY * tileSize
  const tileEndX = tileWorldX + tileSize
  const tileEndY = tileWorldY + tileSize
  const repaintEndX = bounds.x + bounds.width
  const repaintEndY = bounds.y + bounds.height

  const overlapX = Math.max(tileWorldX, bounds.x)
  const overlapY = Math.max(tileWorldY, bounds.y)
  const overlapW = Math.min(tileEndX, repaintEndX) - overlapX
  const overlapH = Math.min(tileEndY, repaintEndY) - overlapY

  if (overlapW <= 0 || overlapH <= 0) return

  const srcX = (overlapX - bounds.x) * scaleX
  const srcY = (overlapY - bounds.y) * scaleY
  const srcW = overlapW * scaleX
  const srcH = overlapH * scaleY
  const destX = overlapX - tileWorldX
  const destY = overlapY - tileWorldY

  console.log(`${RepaintServiceLog.CompositingOntoTile} ${tileX}${TILE_COORD_SEPARATOR}${tileY}:`, {
    srcX,
    srcY,
    srcW,
    srcH,
    destX,
    destY,
    destW: overlapW,
    destH: overlapH,
  })

  ctx.drawImage(repaintImg, srcX, srcY, srcW, srcH, destX, destY, overlapW, overlapH)
}

export async function compositeRepaintOntoTile(params: {
  tileX: number
  tileY: number
  tileSize: number
  bounds: RepaintBounds
  repaintImg: HTMLImageElement
  scaleX: number
  scaleY: number
  existingTile: Tile | undefined
  projectId: string
}): Promise<string | null> {
  const {
    tileX,
    tileY,
    tileSize,
    bounds,
    repaintImg,
    scaleX,
    scaleY,
    existingTile,
    projectId,
  } = params

  if (!tileOverlapsRepaintBounds(tileX, tileY, tileSize, bounds)) {
    console.log(
      `  ${RepaintServiceLog.SkippingTileNoOverlap} ${tileX}${TILE_COORD_SEPARATOR}${tileY} - no overlap`
    )
    return null
  }

  console.log(
    `${RepaintServiceLog.ProcessingTile} ${tileX}${TILE_COORD_SEPARATOR}${tileY}`,
    existingTile ? RepaintTileStatusLabel.Exists : RepaintTileStatusLabel.New
  )

  const tileCanvas = document.createElement(HtmlElementTag.Canvas)
  tileCanvas.width = tileSize
  tileCanvas.height = tileSize
  const ctx = tileCanvas.getContext(CanvasContextType.TwoD)
  if (!ctx) {
    throw new Error(RepaintServiceError.FailedToAcquireCanvasContext)
  }

  await drawExistingTileBackground(ctx, existingTile, projectId, tileSize)
  drawRepaintOverlap(ctx, repaintImg, tileX, tileY, tileSize, bounds, scaleX, scaleY)

  return tileCanvas.toDataURL(RepaintImageMime.Png).split(',')[1]
}
