import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { ActionPayloadKey } from '@/domains/storyteller/core/formatting/constants/action-display'
import { readString, recordFromJson } from '@/shared/data/json-guards'

export function reviewChangesFromAction(action: WireAgentAction): unknown {
  const payload = recordFromJson(action.payload)
  const draft = readString(payload[ActionPayloadKey.Draft])
  if (!draft) return payload
  try {
    const parsed: unknown = JSON.parse(draft)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {
    return { [ActionPayloadKey.Draft]: draft }
  }
  return { [ActionPayloadKey.Draft]: draft }
}
