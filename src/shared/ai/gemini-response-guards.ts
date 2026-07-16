import {
  isPlainObject,
  readString,
  recordFromJson,
} from '@/shared/data/json-guards'

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

function parseInlineData(value: unknown): GeminiInlineData | undefined {
  const record = recordFromJson(value)
  if (Object.keys(record).length === 0) return undefined
  return {
    mime_type: readString(record.mime_type),
    mimeType: readString(record.mimeType),
    data: readString(record.data),
  }
}

function parseGeminiPart(value: Record<string, unknown>): GeminiContentPart {
  return {
    inline_data: parseInlineData(value.inline_data),
    inlineData: parseInlineData(value.inlineData),
    text: readString(value.text),
  }
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

export function parseGeminiResponse(value: unknown): GeminiResponse {
  const record = recordFromJson(value)
  const candidates = Array.isArray(record.candidates)
    ? record.candidates.filter(isPlainObject).map(parseGeminiCandidate)
    : undefined
  return { candidates }
}

export function readGeminiImageData(part: GeminiContentPart): string | undefined {
  const inline = part.inline_data ?? part.inlineData
  return inline ? readString(inline.data) : undefined
}

export function findGeminiImagePart(parts: GeminiContentPart[]): GeminiContentPart | undefined {
  return parts.find(part => part.inline_data !== undefined || part.inlineData !== undefined)
}

export function findGeminiTextPart(parts: GeminiContentPart[]): GeminiContentPart | undefined {
  return parts.find(part => part.text !== undefined)
}
