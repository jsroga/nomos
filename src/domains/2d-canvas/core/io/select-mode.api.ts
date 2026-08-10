import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { readString } from '@/shared/data/json-guards'
import {
  HttpHeaderName,
  SelectModeApiRoute,
} from '../../constants/select-mode-service'
import type { SelectBox } from '../../state/client-services/select-mode-service'

const JSON_HEADERS = { [HttpHeaderName.ContentType]: ContentType.Json }

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

export async function postFalSegment(input: {
  image: string
  box: SelectBox
  apiKey: string
  textPrompt?: string
  samParams: Record<string, unknown>
  signal: AbortSignal
}): Promise<Record<string, unknown>> {
  return postSegmentation(
    SelectModeApiRoute.FalSegment,
    {
      image: input.image,
      box: input.box,
      apiKey: input.apiKey,
      textPrompt: input.textPrompt,
      samParams: input.samParams,
    },
    input.signal
  )
}
