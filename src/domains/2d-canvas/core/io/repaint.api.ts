import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { readString } from '@/shared/data/json-guards'
import { RepaintApiRoute } from '../../constants/repaint-service'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }
const REPAINT_API_FAILED_ERROR = 'Repaint API failed'

export async function postRepaint(input: {
  projectId: string
  base64Image: string
  maskBase64: string
  prompt: string
  styleReferenceUrls?: string[]
}): Promise<{ imageBase64: string }> {
  const data = await fetchJsonRecord(RepaintApiRoute.Repaint, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const imageBase64 = readString(data.imageBase64)
  if (!imageBase64) {
    throw new Error(readString(data.error) ?? REPAINT_API_FAILED_ERROR)
  }
  return { imageBase64 }
}
