import { recordFromJson } from '@/shared/data/json-guards'
import {
  ReplicateImageOutputType,
  ReplicateOutputLogPrefix,
} from '@/shared/ai/constants/replicate-output'
import { BufferEncoding, ReplicateOutputMethod } from '@/shared/data/constants/protocol'
import {
  parseArrayReplicateOutput,
  parseRecordReplicateOutput,
  parseStringReplicateOutput,
  type ParsedImageOutput,
} from '@/shared/ai/replicate-output-parsers'

export type { ParsedImageOutput } from '@/shared/ai/replicate-output-parsers'

export type ReplicateModelId = `${string}/${string}`

export function isReplicateModelId(model: string): model is ReplicateModelId {
  const slash = model.indexOf('/')
  return slash > 0 && slash < model.length - 1
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
    return parseStringReplicateOutput(output)
  }

  if (Array.isArray(output)) {
    const fromArray = parseArrayReplicateOutput(output)
    if (fromArray) return fromArray
  }

  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const fromRecord = parseRecordReplicateOutput(recordFromJson(output))
    if (fromRecord) return fromRecord

    if (isReadableStream(output)) {
      return imageFromReadableStream(output)
    }
  }

  throw new Error(
    `${ReplicateOutputLogPrefix.UnexpectedFormat} ${JSON.stringify(output).substring(0, 500)}`
  )
}
