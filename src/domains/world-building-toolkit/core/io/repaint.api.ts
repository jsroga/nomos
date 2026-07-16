import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { RepaintApiRoute } from '../../constants/repaint-service'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

export async function postRepaint(input: {
  projectId: string
  base64Image: string
  maskBase64: string
  prompt: string
  styleReferenceUrls?: string[]
}): Promise<{ imageBase64: string }> {
  const response = await fetch(RepaintApiRoute.Repaint, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const data = recordFromJson(await response.json().catch(() => ({})))
  const imageBase64 = readString(data.imageBase64)
  if (!response.ok || !imageBase64) {
    throw new Error(readString(data.error) ?? 'Repaint API failed')
  }
  return { imageBase64 }
}
