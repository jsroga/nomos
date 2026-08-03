import type { Tile } from '../../core/world-types'
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
import type { PixelBounds, TileRange, WorldBounds } from './select-mode-segment-bounds'

type LoadImageFn = (url: string) => Promise<HTMLImageElement>

export async function buildContextCanvasBase64(params: {
  tiles: Record<string, Tile>
  projectId: string
  tileRange: TileRange
  worldBounds: WorldBounds
  pixelBounds: PixelBounds
  effectiveTileSize: number
  loadImage: LoadImageFn
}): Promise<string> {
  const { tiles, projectId, tileRange, pixelBounds, effectiveTileSize, loadImage } = params

  const canvas = document.createElement(HtmlElementTag.Canvas)
  canvas.width = pixelBounds.width
  canvas.height = pixelBounds.height
  const ctx = canvas.getContext(CanvasContextType.TwoD)
  if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvas)

  ctx.fillStyle = SelectModeCanvasFill.DebugGray
  ctx.fillRect(0, 0, pixelBounds.width, pixelBounds.height)

  const imagePromises: Promise<void>[] = []

  for (let tx = tileRange.startTileX; tx <= tileRange.endTileX; tx++) {
    for (let ty = tileRange.startTileY; ty <= tileRange.endTileY; ty++) {
      const tileKey = `${tx},${ty}`
      const tile = tiles[tileKey]

      if (!tile?.image_filename) {
        console.warn(`[SelectModeService] Tile ${tileKey} not found in store`)
        continue
      }

      const pid = projectId || tile.project_id
      const imagePath = tile.image_filename.startsWith(UrlScheme.Http)
        ? tile.image_filename
        : `/projects/${pid}/${tile.image_filename}`

      const promise = loadImage(imagePath)
        .then(img => {
          const drawX = Math.round(tx * effectiveTileSize - pixelBounds.x)
          const drawY = Math.round(ty * effectiveTileSize - pixelBounds.y)
          ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, effectiveTileSize, effectiveTileSize)
        })
        .catch(err => {
          console.error(`[SelectModeService] Failed to load tile ${tileKey} from ${imagePath}`, err)
        })

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

export async function detectTileResolution(params: {
  tileRange: TileRange
  tiles: Record<string, Tile>
  projectId: string
  defaultTileSize: number
  loadImage: LoadImageFn
}): Promise<number> {
  const { tileRange, tiles, projectId, defaultTileSize, loadImage } = params
  let tileResolution = defaultTileSize

  for (let tx = tileRange.startTileX; tx <= tileRange.endTileX && tileResolution === defaultTileSize; tx++) {
    for (let ty = tileRange.startTileY; ty <= tileRange.endTileY && tileResolution === defaultTileSize; ty++) {
      const tile = tiles[`${tx},${ty}`]
      if (!tile?.image_filename) continue

      try {
        const pid = projectId || tile.project_id
        const imgUrl = tile.image_filename.startsWith(UrlScheme.Http)
          ? tile.image_filename
          : `/projects/${pid}/${tile.image_filename}`
        const img = await loadImage(imgUrl)
        tileResolution = img.naturalWidth
        console.log(`[SelectModeService] Detected tile resolution: ${tileResolution}px`)
      } catch {
        console.warn(SelectModeLogMessage.CouldNotDetectTileResolution)
      }
    }
  }

  return tileResolution
}

export function computeEffectiveTileSize(tileSize: number, finalScale: number): number {
  return Math.round(tileSize * finalScale)
}
