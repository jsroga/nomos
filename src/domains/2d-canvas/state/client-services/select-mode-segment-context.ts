import type { Tile } from '../../core/world-types'
import { TILE_COORD_SEPARATOR } from '../../ui/constants/tile-stage-labels'
import {
  CanvasContextType,
  ContentType,
  DATA_URL_PNG_PREFIX,
  HtmlElementTag,
  SelectModeCanvasFill,
  SelectModeErrorMessage,
  SelectModeLogMessage,
  SelectModePixelSample,
  UrlScheme,
} from '../../constants/select-mode-service'
import type { TileRange } from './select-mode-segment-bounds'
import { cellDrawOrigin } from './select-mode-segment-bounds'

type LoadImageFn = (url: string) => Promise<HTMLImageElement>

function tileImagePath(filename: string, projectId: string, tileProjectId: string): string {
  if (filename.startsWith(UrlScheme.Http)) return filename
  const pid = projectId || tileProjectId
  return `/projects/${pid}/${filename}`
}

export async function buildContextCanvasBase64(params: {
  tiles: Record<string, Tile>
  projectId: string
  tileRange: TileRange
  cellSize: number
  mosaicWidth: number
  mosaicHeight: number
  loadImage: LoadImageFn
}): Promise<string> {
  const { tiles, projectId, tileRange, cellSize, mosaicWidth, mosaicHeight, loadImage } = params

  const canvas = document.createElement(HtmlElementTag.Canvas)
  canvas.width = mosaicWidth
  canvas.height = mosaicHeight
  const ctx = canvas.getContext(CanvasContextType.TwoD)
  if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvas)

  ctx.fillStyle = SelectModeCanvasFill.DebugGray
  ctx.fillRect(0, 0, mosaicWidth, mosaicHeight)

  const imagePromises: Promise<void>[] = []

  for (let tx = tileRange.startTileX; tx <= tileRange.endTileX; tx++) {
    for (let ty = tileRange.startTileY; ty <= tileRange.endTileY; ty++) {
      const tileKey = `${tx}${TILE_COORD_SEPARATOR}${ty}`
      const tile = tiles[tileKey]

      if (!tile?.image_filename) {
        console.warn(SelectModeLogMessage.TileNotInStore, tileKey)
        continue
      }

      const imagePath = tileImagePath(tile.image_filename, projectId, tile.project_id)
      const origin = cellDrawOrigin(tx, ty, tileRange, cellSize)

      const promise = (async () => {
        try {
          const img = await loadImage(imagePath)
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            origin.x,
            origin.y,
            cellSize,
            cellSize,
          )
        } catch (err) {
          console.error(SelectModeLogMessage.FailedToLoadTile, tileKey, imagePath, err)
        }
      })()

      imagePromises.push(promise)
    }
  }

  await Promise.all(imagePromises)

  const samples = [
    { name: SelectModePixelSample.TopLeft, x: 10, y: 10 },
    { name: SelectModePixelSample.TopRight, x: canvas.width - 10, y: 10 },
    { name: SelectModePixelSample.Center, x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) },
    { name: SelectModePixelSample.BottomLeft, x: 10, y: canvas.height - 10 },
    { name: SelectModePixelSample.BottomRight, x: canvas.width - 10, y: canvas.height - 10 },
  ]
  const pixelSamples: Record<string, number[]> = {}
  samples.forEach(sample => {
    const pixel = ctx.getImageData(sample.x, sample.y, 1, 1).data
    pixelSamples[sample.name] = Array.from(pixel)
  })
  console.log(SelectModeLogMessage.DebugCanvasPixelSamples, pixelSamples)

  const base64Image = canvas.toDataURL(ContentType.Png)
  window.__DEBUG_CONTEXT_IMAGE__ = base64Image

  const base64Data = base64Image.slice(DATA_URL_PNG_PREFIX.length)
  console.log(SelectModeLogMessage.Base64Validation, {
    totalLength: base64Image.length,
    base64DataLength: base64Data.length,
    isValidPrefix: base64Image.startsWith(DATA_URL_PNG_PREFIX),
    isValidBase64Length: base64Data.length > 0 && base64Data.length % 4 === 0,
    estimatedSizeMB: ((base64Data.length * 0.75) / 1024 / 1024).toFixed(2),
    ending: base64Image.slice(-20),
  })

  return base64Image
}

export async function detectMaxTileResolution(params: {
  tileRange: TileRange
  tiles: Record<string, Tile>
  projectId: string
  defaultTileSize: number
  loadImage: LoadImageFn
}): Promise<number> {
  const { tileRange, tiles, projectId, defaultTileSize, loadImage } = params
  let maxResolution = defaultTileSize

  for (let tx = tileRange.startTileX; tx <= tileRange.endTileX; tx++) {
    for (let ty = tileRange.startTileY; ty <= tileRange.endTileY; ty++) {
      const tile = tiles[`${tx}${TILE_COORD_SEPARATOR}${ty}`]
      if (!tile?.image_filename) continue

      try {
        const img = await loadImage(tileImagePath(tile.image_filename, projectId, tile.project_id))
        if (img.naturalWidth > maxResolution) {
          maxResolution = img.naturalWidth
        }
      } catch {
        console.warn(SelectModeLogMessage.CouldNotDetectTileResolution)
      }
    }
  }

  console.log(SelectModeLogMessage.DetectedMaxTileResolution, maxResolution)
  return maxResolution
}
