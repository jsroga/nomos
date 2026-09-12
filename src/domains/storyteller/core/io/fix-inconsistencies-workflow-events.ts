import { isPlainObject, readString, recordFromJson } from '@/shared/data/json-guards'
import { FixInconsistenciesWorkflowChunk } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

export function workflowStepStartId(event: unknown): string | undefined {
  if (!isPlainObject(event)) return undefined
  if (readString(event.type) !== FixInconsistenciesWorkflowChunk.StepStart) return undefined
  const payload = recordFromJson(event.payload)
  return readString(payload.id) ?? readString(event.id)
}
