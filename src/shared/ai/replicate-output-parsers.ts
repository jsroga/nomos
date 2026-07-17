import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  REPLICATE_DATA_URL_BASE64_PREFIX,
  ReplicateImageOutputType,
  ReplicateOutputField,
} from '@/shared/ai/constants/replicate-output'
import { UrlScheme } from '@/shared/data/constants/protocol'

export interface ParsedImageOutput {
  type: ReplicateImageOutputType
  data: string
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

export function parseStringReplicateOutput(output: string): ParsedImageOutput {
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

export function parseArrayReplicateOutput(output: unknown[]): ParsedImageOutput | null {
  if (output.length === 0) return null

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
  return null
}

export function parseRecordReplicateOutput(
  record: Record<string, unknown>
): ParsedImageOutput | null {
  const url = urlFromRecord(record)
  if (url?.startsWith(UrlScheme.Http)) {
    return { type: ReplicateImageOutputType.Url, data: url }
  }
  return null
}
