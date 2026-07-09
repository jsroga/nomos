import { readString, recordFromJson } from '@/shared/data/json-guards'

export interface ParsedImageOutput {
  type: 'url' | 'base64'
  data: string
}

export type ReplicateModelId = `${string}/${string}`

export function isReplicateModelId(model: string): model is ReplicateModelId {
  const slash = model.indexOf('/')
  return slash > 0 && slash < model.length - 1
}

function urlFromRecord(record: Record<string, unknown>): string | undefined {
  return (
    readString(record.url) ??
    readString(record.href) ??
    readString(record.uri) ??
    readString(record.output) ??
    readString(record.image)
  )
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof value === 'object' && value !== null && 'getReader' in value
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
  return { type: 'base64', data: Buffer.from(combined).toString('base64') }
}

export async function parseReplicateImageOutput(output: unknown): Promise<ParsedImageOutput> {
  if (typeof output === 'string') {
    if (output.startsWith('http')) return { type: 'url', data: output }
    if (output.startsWith('data:')) {
      return { type: 'base64', data: output.replace(/^data:image\/\w+;base64,/, '') }
    }
    return { type: 'base64', data: output }
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (typeof first === 'string' && first.startsWith('http')) {
      return { type: 'url', data: first }
    }
    if (typeof first === 'object' && first !== null) {
      const url = urlFromRecord(recordFromJson(first))
      if (url?.startsWith('http')) return { type: 'url', data: url }
    }
  }

  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const record = recordFromJson(output)
    const url = urlFromRecord(record)
    if (url?.startsWith('http')) return { type: 'url', data: url }

    if (isReadableStream(output)) {
      return imageFromReadableStream(output)
    }
  }

  throw new Error(`Unexpected Replicate output format: ${JSON.stringify(output).substring(0, 500)}`)
}
