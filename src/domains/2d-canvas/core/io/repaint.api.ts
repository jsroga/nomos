import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { fetchJsonRecord, readJsonBody } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import { POLLING_INTERVALS, TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  readTriggerRunOutputField,
} from '@/shared/data/polling/trigger-run-polling'
import { waitForTriggerRun } from '@/shared/data/polling/wait-for-trigger-run'
import {
  RepaintApiRoute,
  RepaintOutputField,
  RepaintServiceError,
} from '../../constants/repaint-service'
import type { WorldGenTriggerStatusResult } from './world-gen-trigger.api'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }
const REPAINT_MAX_POLLS = 120

async function fetchRepaintRunStatus(runId: string): Promise<WorldGenTriggerStatusResult> {
  const response = await fetch(
    buildUrl(RepaintApiRoute.Status, { [QueryParam.RunId]: runId }),
    TRIGGER_STATUS_FETCH_INIT,
  )
  const body = recordFromJson(await readJsonBody(response, {}))
  return {
    statusCode: response.status,
    status: readString(body.status),
    output: recordFromJson(body.output),
    error: body.error,
    metadata: recordFromJson(body.metadata),
  }
}

export async function postRepaint(input: {
  projectId: string
  base64Image: string
  maskBase64: string
  prompt: string
  styleReferenceUrls?: string[]
}): Promise<{ imageBase64: string }> {
  const data = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.REPAINT_TILE}:${input.projectId}:${input.prompt}`,
    requestId =>
      fetchJsonRecord(RepaintApiRoute.Repaint, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
  )
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? RepaintServiceError.RepaintTriggerFailed)
  }

  const result = await waitForTriggerRun(
    createTriggerRunStatusFetch(fetchRepaintRunStatus, runId),
    {
      intervalMs: POLLING_INTERVALS.DEFAULT,
      maxPolls: REPAINT_MAX_POLLS,
    },
  )

  const imageBase64 = readTriggerRunOutputField(result, RepaintOutputField.ImageBase64)
  if (!imageBase64) {
    throw new Error(RepaintServiceError.RepaintOutputMissing)
  }
  return { imageBase64 }
}
