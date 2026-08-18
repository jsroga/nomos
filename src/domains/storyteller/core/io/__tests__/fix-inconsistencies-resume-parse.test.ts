import { describe, expect, it } from 'vitest'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'
import {
  FixInconsistenciesResumeError,
  FixInconsistenciesVerdictAction,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import {
  FIX_INCONSISTENCIES_RESUME_BAD_REQUEST,
  isSuspendedFixInconsistenciesRun,
  parseFixInconsistenciesResumeBody,
} from '../fix-inconsistencies-resume-parse'

describe('fix-inconsistencies resume route contract', () => {
  it('rejects unknown actions', () => {
    const parsed = parseFixInconsistenciesResumeBody({
      runId: 'run-1',
      action: 'approve',
      projectId: 'p1',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) throw new Error('unreachable')
    expect(parsed.status).toBe(FIX_INCONSISTENCIES_RESUME_BAD_REQUEST)
    expect(parsed.error).toBe(FixInconsistenciesResumeError.UnknownAction)
    expect(parsed.runId).toBe('run-1')
  })

  it('accepts apply', () => {
    const parsed = parseFixInconsistenciesResumeBody({
      runId: 'run-1',
      action: FixInconsistenciesVerdictAction.Apply,
      projectId: 'p1',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) throw new Error('unreachable')
    expect(parsed.data.action).toBe(FixInconsistenciesVerdictAction.Apply)
  })

  it('rejects a non-suspended runId', () => {
    expect(isSuspendedFixInconsistenciesRun(MastraWorkflowStatus.Failed)).toBe(false)
    expect(isSuspendedFixInconsistenciesRun(MastraWorkflowStatus.Suspended)).toBe(true)
    expect(isSuspendedFixInconsistenciesRun(undefined)).toBe(false)
  })

  it('rejects an empty payload', () => {
    const parsed = parseFixInconsistenciesResumeBody({})
    expect(parsed.ok).toBe(false)
    if (parsed.ok) throw new Error('unreachable')
    expect(parsed.error).toBe(API_ERROR.INVALID_PAYLOAD)
  })
})
