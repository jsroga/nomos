import type { Tile } from '../../core/world-types'
import { SelectModeLogLabel, SelectModeLogMessage } from '../../constants/select-mode-service'
import {
  computeCoveringTileRange,
  computeMergedGridLayout,
  WORLD_TILE_SIZE,
} from './select-mode-segment-bounds'
import {
  buildContextCanvasBase64,
  detectMaxTileResolution,
} from './select-mode-segment-context'
import { runSegmentationRequest } from './select-mode-segment-api'
import {
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

    const tileRange = computeCoveringTileRange(box, WORLD_TILE_SIZE)
    const nativeCellSize = await detectMaxTileResolution({
      tileRange,
      tiles,
      projectId,
      defaultTileSize: WORLD_TILE_SIZE,
      loadImage,
    })
    const layout = computeMergedGridLayout({
      range: tileRange,
      box,
      nativeCellSize,
    })
    const { worldBounds, pixelBounds, relativeBox, cellSize } = layout

    console.log(SelectModeLogMessage.MosaicLayout, {
      cellSize,
      nativeCellSize,
      worldBounds,
      [SelectModeLogLabel.PixelBounds]: pixelBounds,
    })

    const base64Image = await buildContextCanvasBase64({
      tiles,
      projectId,
      tileRange,
      cellSize,
      mosaicWidth: layout.mosaicWidth,
      mosaicHeight: layout.mosaicHeight,
      loadImage,
    })

    let maskUrl = ''
    let apiResponse: unknown = null

    try {
      const segmentation = await runSegmentationRequest({
        provider: getSegmentationProvider(),
        projectId,
        base64Image,
        relativeBox,
        pixelBounds,
        textPrompt,
        replicateApiKey: getReplicateApiKey(),
        samParams: getSamParams(),
        signal: this.abortController.signal,
        fetchMaskAsDataUrl,
        resizeMask,
      })

      maskUrl = segmentation.maskUrl
      apiResponse = segmentation.apiResponse

      return {
        imageUrl: maskUrl,
        bounds: worldBounds,
        debugInfo: {
          contextImage: base64Image,
          box: relativeBox,
          apiResponse,
          maskUrl,
          scale: cellSize / WORLD_TILE_SIZE,
          worldBounds,
          pixelBounds,
        },
      }
    } catch (error: unknown) {
      console.error(SelectModeLogMessage.ErrorDuringSegmentation, error)
      return {
        imageUrl: maskUrl,
        bounds: worldBounds,
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
