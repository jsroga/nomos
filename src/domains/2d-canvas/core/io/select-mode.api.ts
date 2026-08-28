import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import { POLLING_INTERVALS, TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import { waitForTriggerRun } from '@/shared/data/polling/wait-for-trigger-run'
import {
  HttpHeaderName,
  SegmentOutputField,
  SelectModeApiRoute,
} from '../../constants/select-mode-service'
import type { SelectBox } from '../../state/client-services/select-mode-types'

const JSON_HEADERS = { [HttpHeaderName.ContentType]: ContentType.Json }
const SEGMENT_MAX_POLLS = 120

export enum SelectModeServiceError {
  SegmentTriggerFailed = 'Failed to trigger segment task',
  SegmentOutputMissing = 'Segment run completed without an RLE mask',
}

async function postSegmentation(
  route: string,
  body: Record<string, unknown>,
  signal: AbortSignal
): Promise<Record<string, unknown>> {
  const data = await fetchJsonRecord(route, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
    signal,
  })
  const error = readString(data.error)
  if (error) {
    throw new Error(error)
  }
  return data
}

export async function postReplicateSegment(input: {
  image: string
  apiKey: string
  signal: AbortSignal
}): Promise<Record<string, unknown>> {
  return postSegmentation(
    SelectModeApiRoute.Segment,
    { image: input.image, points: [], apiKey: input.apiKey },
    input.signal
  )
}

async function fetchSegmentRunStatus(runId: string): Promise<{
  statusCode: number
  status: string | undefined
  output: Record<string, unknown>
  error: unknown
  metadata: Record<string, unknown>
}> {
  const response = await fetch(
    buildUrl(SelectModeApiRoute.Status, { [QueryParam.RunId]: runId }),
    TRIGGER_STATUS_FETCH_INIT,
  )
  const body = recordFromJson(await response.json().catch(() => ({})))
  return {
    statusCode: response.status,
    status: readString(body.status),
    output: recordFromJson(body.output),
    error: body.error,
    metadata: recordFromJson(body.metadata),
  }
}

export async function postSegment(input: {
  projectId: string
  base64Image: string
  box: SelectBox
  prompt?: string
  mosaicWidth: number
  mosaicHeight: number
  signal: AbortSignal
}): Promise<{ rle: string; width: number; height: number; apiResponse: unknown }> {
  const data = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.SEGMENT_OBJECT}:${input.projectId}:${input.box.x1},${input.box.y1}`,
    requestId =>
      postSegmentation(
        SelectModeApiRoute.Enqueue,
        {
          projectId: input.projectId,
          requestId,
          base64Image: input.base64Image,
          box: input.box,
          prompt: input.prompt,
          mosaicWidth: input.mosaicWidth,
          mosaicHeight: input.mosaicHeight,
        },
        input.signal,
      )
  )
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? SelectModeServiceError.SegmentTriggerFailed)
  }

  const result = await waitForTriggerRun(
    createTriggerRunStatusFetch(fetchSegmentRunStatus, runId),
    {
      intervalMs: POLLING_INTERVALS.DEFAULT,
      maxPolls: SEGMENT_MAX_POLLS,
      shouldAbort: () => input.signal.aborted,
    },
  )

  const output = recordFromJson(result.output)
  const rle = readString(output[SegmentOutputField.Rle])
  if (!rle) {
    throw new Error(SelectModeServiceError.SegmentOutputMissing)
  }

  return {
    rle,
    width: readNumber(output[SegmentOutputField.Width]) ?? input.mosaicWidth,
    height: readNumber(output[SegmentOutputField.Height]) ?? input.mosaicHeight,
    apiResponse: output,
  }
}
