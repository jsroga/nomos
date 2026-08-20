import { logger, metadata } from '@trigger.dev/sdk/v3'
import { FalClient } from '@/shared/ai/fal'
import { readFalApiKey, resolveSamPrompt } from '@/shared/ai/constants/fal'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { SegmentOutputField } from '@/domains/2d-canvas/constants/select-mode-service'

export enum SegmentRunMetadata {
  ProjectId = 'projectId',
  Prompt = 'prompt',
  MosaicWidth = 'mosaicWidth',
  MosaicHeight = 'mosaicHeight',
}

export enum SegmentRunLog {
  Starting = 'Starting object segmentation',
}

export enum SegmentRunError {
  NoRle = 'SAM-3 returned no RLE mask',
}

export interface SegmentObjectBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SegmentObjectPayload {
  projectId: string
  base64Image: string
  box: SegmentObjectBox
  prompt?: string
  mosaicWidth: number
  mosaicHeight: number
}

export interface SegmentObjectOutput {
  rle: string
  width: number
  height: number
}

function readRle(output: Record<string, unknown>): string | null {
  const asString = readString(output[SegmentOutputField.Rle])
  if (asString) return asString
  const list = output[SegmentOutputField.Rle]
  if (!Array.isArray(list) || list.length === 0) return null
  return readString(list[0]) ?? null
}

export async function runSegmentObject(
  payload: SegmentObjectPayload,
): Promise<SegmentObjectOutput> {
  const apiKey = readFalApiKey()
  if (!apiKey) {
    throw new Error(API_ERROR.FAL_KEY_NOT_PROVIDED)
  }

  const prompt = resolveSamPrompt(payload.prompt)
  await metadata.set(SegmentRunMetadata.ProjectId, payload.projectId)
  await metadata.set(SegmentRunMetadata.Prompt, prompt)
  await metadata.set(SegmentRunMetadata.MosaicWidth, payload.mosaicWidth)
  await metadata.set(SegmentRunMetadata.MosaicHeight, payload.mosaicHeight)

  logger.info(SegmentRunLog.Starting, {
    projectId: payload.projectId,
    prompt,
    task: TRIGGER_TASK_ID.SEGMENT_OBJECT,
    mosaicWidth: payload.mosaicWidth,
    mosaicHeight: payload.mosaicHeight,
  })

  const client = new FalClient(apiKey)
  let output: Record<string, unknown>
  try {
    output = recordFromJson(await client.segmentObject(payload.base64Image, payload.box, prompt))
  } catch (error: unknown) {
    logger.error(getErrorMessage(error))
    throw error
  }

  const rle = readRle(output)
  if (!rle) {
    throw new Error(SegmentRunError.NoRle)
  }

  return {
    rle,
    width: readNumber(output[SegmentOutputField.Width]) ?? payload.mosaicWidth,
    height: readNumber(output[SegmentOutputField.Height]) ?? payload.mosaicHeight,
  }
}
