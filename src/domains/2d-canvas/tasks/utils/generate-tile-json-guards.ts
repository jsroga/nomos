import {
  isPlainObject,
  readString,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { LegNextJobStatus } from '@/shared/ai/constants/legnext'

export interface GeminiInlineData {
  mime_type?: string
  mimeType?: string
  data?: string
}

export interface GeminiContentPart {
  inline_data?: GeminiInlineData
  inlineData?: GeminiInlineData
  text?: string
}

export interface GeminiCandidate {
  finishReason?: string
  content?: { parts?: GeminiContentPart[] }
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

export interface LegNextJobOutput {
  image_url?: string
  image_urls?: string[]
  error_messages?: string[]
}

export interface LegNextJobResult {
  status: string
  message?: string
  output?: LegNextJobOutput
  job_id?: string
}

export function parseGeminiResponse(value: unknown): GeminiResponse {
  const record = recordFromJson(value)
  const candidates = Array.isArray(record.candidates)
    ? record.candidates.filter(isPlainObject).map(parseGeminiCandidate)
    : undefined
  return { candidates }
}

function parseGeminiCandidate(value: Record<string, unknown>): GeminiCandidate {
  const content = recordFromJson(value.content)
  const parts = Array.isArray(content.parts)
    ? content.parts.filter(isPlainObject).map(parseGeminiPart)
    : undefined
  return {
    finishReason: readString(value.finishReason),
    content: parts ? { parts } : undefined,
  }
}

function parseGeminiPart(value: Record<string, unknown>): GeminiContentPart {
  return {
    inline_data: parseInlineData(value.inline_data),
    inlineData: parseInlineData(value.inlineData),
    text: readString(value.text),
  }
}

function parseInlineData(value: unknown): GeminiInlineData | undefined {
  const record = recordFromJson(value)
  if (Object.keys(record).length === 0) return undefined
  return {
    mime_type: readString(record.mime_type),
    mimeType: readString(record.mimeType),
    data: readString(record.data),
  }
}

export function readGeminiImageData(part: GeminiContentPart): string | undefined {
  const inline = part.inline_data ?? part.inlineData
  return inline ? readString(inline.data) : undefined
}

export function parseLegNextJob(value: unknown): LegNextJobResult {
  const record = recordFromJson(value)
  const outputRecord = recordFromJson(record.output)
  const output: LegNextJobOutput = {
    image_url: readString(outputRecord.image_url),
    image_urls: stringArrayFromJson(outputRecord.image_urls),
    error_messages: stringArrayFromJson(outputRecord.error_messages),
  }
  return {
    status: readString(record.status) ?? LegNextJobStatus.Pending,
    message: readString(record.message),
    output: Object.values(output).some(v => v !== undefined) ? output : undefined,
    job_id: readString(record.job_id),
  }
}

export function readLegNextImageUrl(result: LegNextJobResult): string | undefined {
  return result.output?.image_url ?? result.output?.image_urls?.[0]
}

export function readOpenAiB64Json(value: unknown): string | undefined {
  const record = recordFromJson(value)
  const data = Array.isArray(record.data) ? record.data : []
  const first = data[0]
  if (!isPlainObject(first)) return undefined
  return readString(first.b64_json)
}

export function readStabilityBase64(value: unknown): string | undefined {
  const record = recordFromJson(value)
  const artifacts = Array.isArray(record.artifacts) ? record.artifacts : []
  const first = artifacts[0]
  if (!isPlainObject(first)) return undefined
  return readString(first.base64)
}
