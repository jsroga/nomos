import { recordFromJson } from '@/shared/data/json-guards'

enum CompactToolAckKey {
  Success = 'success',
  Message = 'message',
}

const COMPACT_TOOL_ACK_KEY_COUNT = 2

/** True when a tool result is only `{ success, message }` — skip echoing args. */
export function isCompactToolAck(result: unknown): boolean {
  const record = recordFromJson(result)
  if (Object.keys(record).length !== COMPACT_TOOL_ACK_KEY_COUNT) return false
  return (
    typeof record[CompactToolAckKey.Success] === 'boolean' &&
    typeof record[CompactToolAckKey.Message] === 'string'
  )
}

export function compactToolAckMessage(result: unknown): string | null {
  if (!isCompactToolAck(result)) return null
  const record = recordFromJson(result)
  const message = record[CompactToolAckKey.Message]
  return typeof message === 'string' ? message : null
}
