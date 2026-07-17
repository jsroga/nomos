import toast from 'react-hot-toast'
import { assembleContextImage, type ContextImageVariant } from '@/shared/ai/contextAssembler'
import { fetchUrlAsDataUrl } from '@/domains/world-building-toolkit/core/io/world-data.api'
import { fileReaderText } from '@/shared/data/json-guards'
import {
  tileGenerationService,
  type FollowUpContextPayload,
} from '@/domains/world-building-toolkit/state/client-services/tile-generation-service'
import { type Tile } from '@/domains/world-building-toolkit'
import {
  ContextAssemblyVariant,
  UrlScheme,
  WorldGenDataUrlCheck,
  WorldGenSidebarError,
  WorldGenSidebarLog,
  WorldGenTileProvider,
} from '../../ui/constants/sidebar'

export function blobToRawBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = fileReaderText(reader.result)
      if (!dataUrl || !dataUrl.includes(WorldGenDataUrlCheck.Comma))
        reject(new Error(WorldGenSidebarError.InvalidDataUrl))
      else resolve(dataUrl.split(WorldGenDataUrlCheck.Comma)[1])
    }
    reader.onerror = () => reject(new Error(WorldGenSidebarError.FileReaderError))
    reader.readAsDataURL(blob)
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!blob || blob.size === 0) {
      console.error(WorldGenSidebarLog.BlobToDataUrlInvalidBlob, { blob, size: blob?.size })
      reject(new Error(WorldGenSidebarError.InvalidBlob))
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = fileReaderText(reader.result)
      if (dataUrl) resolve(dataUrl)
      else reject(new Error(WorldGenSidebarError.FileReaderError))
    }
    reader.onerror = () => reject(new Error(WorldGenSidebarError.FileReaderError))
    reader.readAsDataURL(blob)
  })
}

export async function loadNeighborTileAsDataUrl(params: {
  tile: Tile | undefined
  projectId: string
}): Promise<(Tile & { imageUrl?: string }) | undefined> {
  const { tile, projectId } = params
  if (!tile || !tile.image_filename) return tile

  const imageUrl = tile.image_filename.startsWith(UrlScheme.Http)
    ? tile.image_filename
    : `${window.location.origin}/projects/${projectId}/${tile.image_filename}`

  try {
    const loadedUrl = await fetchUrlAsDataUrl(imageUrl)
    if (loadedUrl) {
      return { ...tile, imageUrl: loadedUrl }
    }
    return undefined
  } catch (loadError) {
    console.error(WorldGenSidebarLog.FailedToLoadNeighborImage, loadError)
    return undefined
  }
}

export async function generateSingleWorldTile(params: {
  projectId: string
  x: number
  y: number
  tiles: Record<string, Tile>
  tilePrompt: string
  masterPrompt: string
  effectiveStyleUrls: string[]
  setError: (msg: string | null) => void
  setGenerationDebugInfo: (info: Record<string, unknown>) => void
}): Promise<void> {
  const {
    projectId,
    x,
    y,
    tiles,
    tilePrompt,
    masterPrompt,
    effectiveStyleUrls,
    setError,
    setGenerationDebugInfo,
  } = params

  try {
    const hasNeighbors = [
      tiles[`${x},${y - 1}`],
      tiles[`${x},${y + 1}`],
      tiles[`${x - 1},${y}`],
      tiles[`${x + 1},${y}`],
    ].some(Boolean)

    const effectiveTilePrompt = tilePrompt.trim() || masterPrompt
    const fullPrompt = hasNeighbors
      ? effectiveTilePrompt
      : `${tilePrompt}, ${masterPrompt}`.replace(/^, /, '')

    let followUpContext: FollowUpContextPayload | undefined

    if (hasNeighbors) {
      const [upTile, downTile, leftTile, rightTile, topLeftTile, topRightTile, bottomLeftTile, bottomRightTile] =
        await Promise.all([
          loadNeighborTileAsDataUrl({ tile: tiles[`${x},${y - 1}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x},${y + 1}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x - 1},${y}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x + 1},${y}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x - 1},${y - 1}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x + 1},${y - 1}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x - 1},${y + 1}`], projectId }),
          loadNeighborTileAsDataUrl({ tile: tiles[`${x + 1},${y + 1}`], projectId }),
        ])

      const neighbors = {
        up: upTile,
        down: downTile,
        left: leftTile,
        right: rightTile,
        topLeft: topLeftTile,
        topRight: topRightTile,
        bottomLeft: bottomLeftTile,
        bottomRight: bottomRightTile,
      }

      const contextInput = { targetX: x, targetY: y, neighbors, allTiles: tiles }
      const preferredVariant: ContextImageVariant = ContextAssemblyVariant.CanonicalFullContext
      const canonicalContext = await assembleContextImage(
        contextInput,
        1024,
        ContextAssemblyVariant.CanonicalFullContext
      )

      if (canonicalContext.directNeighborCount === 0) {
        throw new Error(WorldGenSidebarError.FailedToLoadNeighborContext)
      }

      const [canonicalBase64, maskBase64] = await Promise.all([
        blobToRawBase64(canonicalContext.imageBlob),
        blobToRawBase64(canonicalContext.maskBlob),
      ])
      followUpContext = {
        images: { canonicalFullContext: canonicalBase64 },
        maskBase64,
        preferredVariant,
      }

      const getImageUrl = (neighborTile: (Tile & { imageUrl?: string }) | undefined) =>
        neighborTile?.imageUrl
      blobToDataUrl(canonicalContext.imageBlob)
        .then(assembledContext =>
          setGenerationDebugInfo({
            neighbors: {
              up: getImageUrl(neighbors.up),
              down: getImageUrl(neighbors.down),
              left: getImageUrl(neighbors.left),
              right: getImageUrl(neighbors.right),
              topLeft: getImageUrl(neighbors.topLeft),
              topRight: getImageUrl(neighbors.topRight),
              bottomLeft: getImageUrl(neighbors.bottomLeft),
              bottomRight: getImageUrl(neighbors.bottomRight),
            },
            prompt: fullPrompt,
            assembledContext,
            contextVariant: preferredVariant,
            contextStrategy: canonicalContext.strategy.mode,
            weightedNeighbors: canonicalContext.strategy.weightedNeighbors,
            provider: WorldGenTileProvider.NanoBanana,
          })
        )
        .catch(() => {})
    }

    await tileGenerationService.generate(
      projectId,
      x,
      y,
      fullPrompt,
      effectiveStyleUrls,
      followUpContext
    )

    toast.success(`Tile (${x},${y}) generation started!`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(err)
    toast.error(`Generation failed: ${msg}`)
    setError(`Generation failed: ${msg}`)
  }
}
