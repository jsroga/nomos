import { recordFromJson, readString, readNumber } from '@/shared/data/json-guards'
import {
  SegmentationProvider,
  SelectModeLogMessage,
} from '../../constants/select-mode-service'
import { postFalSegment, postReplicateSegment } from '../../core/io/select-mode.api'
import type { PixelBounds } from './select-mode-segment-bounds'
import type { SelectBox } from './select-mode-service'

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
  base64Image: string
  relativeBox: SelectBox
  pixelBounds: PixelBounds
  textPrompt?: string
  replicateApiKey: string
  falApiKey: string
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
    base64Image,
    relativeBox,
    pixelBounds,
    textPrompt,
    replicateApiKey,
    falApiKey,
    samParams,
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

  const data = await postFalSegment({
    image: base64Image,
    box: relativeBox,
    apiKey: falApiKey,
    textPrompt,
    samParams,
    signal,
  })
  const output = recordFromJson(data.output)

  let maskUrl = ''
  const rle = readString(output.rle)
  if (rle) {
    const maskWidth = readNumber(output.width) ?? Math.round(pixelBounds.width)
    const maskHeight = readNumber(output.height) ?? Math.round(pixelBounds.height)

    console.log(SelectModeLogMessage.RleDimensions, {
      fromAPI: { width: readNumber(output.width), height: readNumber(output.height) },
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

  return { maskUrl, apiResponse: data }
}
