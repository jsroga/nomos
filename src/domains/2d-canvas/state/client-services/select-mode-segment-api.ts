import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  SegmentationProvider,
  SelectModeLogMessage,
} from '../../constants/select-mode-service'
import { postReplicateSegment, postSegment } from '../../core/io/select-mode.api'
import type { PixelBounds } from './select-mode-segment-bounds'
import type { SelectBox } from './select-mode-types'

type FetchMaskFn = (
  maskUrl: string,
  targetWidth: number,
  targetHeight: number,
) => Promise<string | null>

type ResizeMaskFn = (
  maskDataUrl: string,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) => Promise<string>

export interface SegmentApiParams {
  provider: SegmentationProvider
  projectId: string
  base64Image: string
  relativeBox: SelectBox
  pixelBounds: PixelBounds
  textPrompt?: string
  replicateApiKey: string
  samParams: {
    returnMultipleMasks?: boolean
    includeScores?: boolean
    includeBoxes?: boolean
  }
  signal: AbortSignal
  fetchMaskAsDataUrl: FetchMaskFn
  resizeMask: ResizeMaskFn
}

export async function runSegmentationRequest(params: SegmentApiParams): Promise<{
  maskUrl: string
  apiResponse: unknown
}> {
  const {
    provider,
    projectId,
    base64Image,
    relativeBox,
    pixelBounds,
    textPrompt,
    replicateApiKey,
    signal,
    fetchMaskAsDataUrl,
    resizeMask,
  } = params

  console.log(SelectModeLogMessage.UsingSegmentationProvider, provider)

  if (provider === SegmentationProvider.Replicate) {
    const data = await postReplicateSegment({
      image: base64Image,
      apiKey: replicateApiKey,
      signal,
    })
    const output = recordFromJson(data.output)

    let maskUrl = ''
    const combinedMask = readString(output.combined_mask)
    if (combinedMask) {
      console.log(SelectModeLogMessage.GotCombinedMaskUrl, combinedMask)
      const fetchedMask = await fetchMaskAsDataUrl(
        combinedMask,
        pixelBounds.width,
        pixelBounds.height,
      )
      if (fetchedMask) maskUrl = fetchedMask
    } else {
      const individualMasks = output.individual_masks
      if (Array.isArray(individualMasks) && individualMasks.length > 0) {
        const firstMask = readString(individualMasks[0])
        if (firstMask) {
          console.log(SelectModeLogMessage.GotIndividualMasks, individualMasks.length)
          const fetchedMask = await fetchMaskAsDataUrl(
            firstMask,
            pixelBounds.width,
            pixelBounds.height,
          )
          if (fetchedMask) maskUrl = fetchedMask
        }
      } else {
        console.warn(SelectModeLogMessage.NoMasksInReplicateResponse)
      }
    }

    return { maskUrl, apiResponse: data }
  }

  const data = await postSegment({
    projectId,
    base64Image,
    box: relativeBox,
    prompt: textPrompt,
    mosaicWidth: pixelBounds.width,
    mosaicHeight: pixelBounds.height,
    signal,
  })

  let maskUrl = ''
  const rle = data.rle
  if (rle) {
    const maskWidth = data.width
    const maskHeight = data.height

    console.log(SelectModeLogMessage.RleDimensions, {
      fromAPI: { width: maskWidth, height: maskHeight },
      expected: { width: pixelBounds.width, height: pixelBounds.height },
      using: { width: maskWidth, height: maskHeight },
    })

    const { rleToDataURL } = await import('../../core/rle')
    const maskDataUrl = rleToDataURL(rle, maskWidth, maskHeight)

    if (maskWidth !== pixelBounds.width || maskHeight !== pixelBounds.height) {
      console.log(SelectModeLogMessage.ResizingMaskToPixelBounds)
      maskUrl = await resizeMask(
        maskDataUrl,
        maskWidth,
        maskHeight,
        pixelBounds.width,
        pixelBounds.height,
      )
    } else {
      maskUrl = maskDataUrl
    }
  } else {
    console.warn(SelectModeLogMessage.NoRleMaskInResponse)
  }

  return { maskUrl, apiResponse: data.apiResponse }
}
