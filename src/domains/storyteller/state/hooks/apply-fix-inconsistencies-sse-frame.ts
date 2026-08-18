import type { FixInconsistenciesSseFrame } from '@/domains/storyteller/core/io/fix-inconsistencies-sse'
import { FixInconsistenciesSseEvent } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import { readString } from '@/shared/data/json-guards'

export interface FixInconsistenciesSseHandlers {
  onStarted: (runId: string | undefined) => void
  onStep: (stepId: string | undefined) => void
  onSuspended: (data: Record<string, unknown>, runId: string) => void
  onComplete: (data: Record<string, unknown>) => void
  onError: (message: string | undefined) => void
}

export function applyFixInconsistenciesSseFrame(
  frame: FixInconsistenciesSseFrame,
  handlers: FixInconsistenciesSseHandlers
): void {
  if (frame.event === FixInconsistenciesSseEvent.Started) {
    handlers.onStarted(readString(frame.data.runId))
    return
  }
  if (frame.event === FixInconsistenciesSseEvent.Step) {
    handlers.onStep(readString(frame.data.stepId))
    return
  }
  if (frame.event === FixInconsistenciesSseEvent.Suspended) {
    handlers.onSuspended(frame.data, readString(frame.data.runId) ?? '')
    return
  }
  if (frame.event === FixInconsistenciesSseEvent.Complete) {
    handlers.onComplete(frame.data)
    return
  }
  handlers.onError(readString(frame.data.message))
}
