import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus, MastraWorkflowStatus } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { fixInconsistenciesResumeSchema } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import {
  FixInconsistenciesResumeError,
  FixInconsistenciesVerdictAction,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

export const FIX_INCONSISTENCIES_RESUME_BAD_REQUEST = HttpStatus.BAD_REQUEST

export function isSuspendedFixInconsistenciesRun(status: string | undefined): boolean {
  return status === MastraWorkflowStatus.Suspended
}

export type ParsedFixInconsistenciesResume =
  | {
      ok: true
      data: { runId: string; action: FixInconsistenciesVerdictAction; projectId: string }
    }
  | { ok: false; status: number; error: string; runId?: string }

export function parseFixInconsistenciesResumeBody(raw: unknown): ParsedFixInconsistenciesResume {
  const json = recordFromJson(raw)
  const parsed = fixInconsistenciesResumeSchema.safeParse(json)
  if (parsed.success) return { ok: true, data: parsed.data }
  const action = readString(json.action)
  if (action) {
    return {
      ok: false,
      status: FIX_INCONSISTENCIES_RESUME_BAD_REQUEST,
      error: FixInconsistenciesResumeError.UnknownAction,
      runId: readString(json.runId),
    }
  }
  return {
    ok: false,
    status: FIX_INCONSISTENCIES_RESUME_BAD_REQUEST,
    error: API_ERROR.INVALID_PAYLOAD,
  }
}
