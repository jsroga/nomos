import type { Tile } from '../../core/world-types'
import { SelectModeLogLabel, SelectModeLogMessage } from '../../constants/select-mode-service'
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
import {
  getFalApiKey,
  getReplicateApiKey,
  getSamParams,
  getSegmentationProvider,
} from './select-mode-config'
import { extractAsset as extractAssetFromMask } from './select-mode-asset-extraction'
import { fetchMaskAsDataUrl, loadImage, resizeMask } from './select-mode-image-utils'
import type { SelectBox, SelectResult } from './select-mode-types'

export type { SelectBox, SelectResult } from './select-mode-types'

declare global {
  interface Window {
    __DEBUG_CONTEXT_IMAGE__?: string
  }
}

export class SelectModeService {
  private TILE_SIZE = 512
  private abortController: AbortController | null = null

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
      loadImage,
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
      loadImage,
    })

    const relativeBox = computeRelativeBox(box, worldBounds, finalScale)

    let maskUrl = ''
    let apiResponse: unknown = null

    try {
      const segmentation = await runSegmentationRequest({
        provider: getSegmentationProvider(),
        base64Image,
        relativeBox,
        pixelBounds,
        textPrompt,
        replicateApiKey: getReplicateApiKey(),
        falApiKey: getFalApiKey(),
        samParams: getSamParams(),
        signal: this.abortController.signal,
        fetchMaskAsDataUrl,
        resizeMask,
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

  async extractAsset(
    contextImageUrl: string,
    maskUrl: string,
    originalBounds: { x: number; y: number; width: number; height: number }
  ): Promise<{
    dataUrl: string
    bounds: { x: number; y: number; width: number; height: number }
  }> {
    return extractAssetFromMask(contextImageUrl, maskUrl, originalBounds)
  }
}

export const selectModeService = new SelectModeService()
