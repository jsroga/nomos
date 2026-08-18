import { recordFromJson } from '@/shared/data/json-guards'
import {
  FixInconsistenciesSseEvent,
  FixInconsistenciesSseField,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

export interface FixInconsistenciesSseFrame {
  event: FixInconsistenciesSseEvent
  data: Record<string, unknown>
}

function isSseEvent(value: string): value is FixInconsistenciesSseEvent {
  return (
    value === FixInconsistenciesSseEvent.Started ||
    value === FixInconsistenciesSseEvent.Step ||
    value === FixInconsistenciesSseEvent.Suspended ||
    value === FixInconsistenciesSseEvent.Complete ||
    value === FixInconsistenciesSseEvent.Error
  )
}

export function encodeFixInconsistenciesSse(
  event: FixInconsistenciesSseEvent,
  data: unknown
): string {
  return `${FixInconsistenciesSseField.EventPrefix}${event}${FixInconsistenciesSseField.LineJoin}${FixInconsistenciesSseField.DataPrefix}${JSON.stringify(data)}${FixInconsistenciesSseField.BlockJoin}`
}

export function parseFixInconsistenciesSseBlock(block: string): FixInconsistenciesSseFrame | null {
  const lines = block.split(FixInconsistenciesSseField.LineJoin)
  let eventName = ''
  let dataRaw = ''
  for (const line of lines) {
    if (line.startsWith(FixInconsistenciesSseField.EventPrefix)) {
      eventName = line.slice(FixInconsistenciesSseField.EventPrefix.length).trim()
    } else if (line.startsWith(FixInconsistenciesSseField.DataPrefix)) {
      dataRaw = line.slice(FixInconsistenciesSseField.DataPrefix.length)
    }
  }
  if (!isSseEvent(eventName) || !dataRaw) return null
  try {
    return { event: eventName, data: recordFromJson(JSON.parse(dataRaw)) }
  } catch {
    return null
  }
}

export function splitFixInconsistenciesSseChunks(
  buffer: string
): { frames: FixInconsistenciesSseFrame[]; rest: string } {
  const parts = buffer.split(FixInconsistenciesSseField.BlockJoin)
  const rest = parts.pop() ?? ''
  const frames: FixInconsistenciesSseFrame[] = []
  for (const part of parts) {
    const frame = parseFixInconsistenciesSseBlock(part)
    if (frame) frames.push(frame)
  }
  return { frames, rest }
}
