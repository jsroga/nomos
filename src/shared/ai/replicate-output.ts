import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  REPLICATE_DATA_URL_BASE64_PREFIX,
  ReplicateImageOutputType,
  ReplicateOutputField,
  ReplicateOutputLogPrefix,
} from '@/shared/ai/constants/replicate-output'
import { BufferEncoding, ReplicateOutputMethod, UrlScheme } from '@/shared/data/constants/protocol'

export interface ParsedImageOutput {
  type: ReplicateImageOutputType
  data: string
}

export type ReplicateModelId = `${string}/${string}`

export function isReplicateModelId(model: string): model is ReplicateModelId {
  const slash = model.indexOf('/')
  return slash > 0 && slash < model.length - 1
}

function urlFromRecord(record: Record<string, unknown>): string | undefined {
  return (
    readString(record[ReplicateOutputField.Url]) ??
    readString(record[ReplicateOutputField.Href]) ??
    readString(record[ReplicateOutputField.Uri]) ??
    readString(record[ReplicateOutputField.Output]) ??
    readString(record[ReplicateOutputField.Image])
  )
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ReplicateOutputMethod.GetReader in value
  )
}

async function imageFromReadableStream(stream: ReadableStream<Uint8Array>): Promise<ParsedImageOutput> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }
  return {
    type: ReplicateImageOutputType.Base64,
    data: Buffer.from(combined).toString(BufferEncoding.Base64),
  }
}

export async function parseReplicateImageOutput(output: unknown): Promise<ParsedImageOutput> {
  if (typeof output === 'string') {
    if (output.startsWith(UrlScheme.Http)) {
      return { type: ReplicateImageOutputType.Url, data: output }
    }
    if (output.startsWith(UrlScheme.Data)) {
      return {
        type: ReplicateImageOutputType.Base64,
        data: output.replace(REPLICATE_DATA_URL_BASE64_PREFIX, ''),
      }
    }
    return { type: ReplicateImageOutputType.Base64, data: output }
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (typeof first === 'string' && first.startsWith(UrlScheme.Http)) {
      return { type: ReplicateImageOutputType.Url, data: first }
    }
    if (typeof first === 'object' && first !== null) {
      const url = urlFromRecord(recordFromJson(first))
      if (url?.startsWith(UrlScheme.Http)) {
        return { type: ReplicateImageOutputType.Url, data: url }
      }
    }
  }

  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const record = recordFromJson(output)
    const url = urlFromRecord(record)
    if (url?.startsWith(UrlScheme.Http)) {
      return { type: ReplicateImageOutputType.Url, data: url }
    }

    if (isReadableStream(output)) {
      return imageFromReadableStream(output)
    }
  }

  throw new Error(
    `${ReplicateOutputLogPrefix.UnexpectedFormat} ${JSON.stringify(output).substring(0, 500)}`
  )
}
