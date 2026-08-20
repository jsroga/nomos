import { describe, expect, it } from 'vitest'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { decideResumeRun, ResumeRunDecision } from '../decide-resume-run'

describe('decideResumeRun', () => {
  it('resumes while the Trigger run is still active', () => {
    expect(decideResumeRun({ status: 'EXECUTING' })).toBe(ResumeRunDecision.Resume)
    expect(decideResumeRun({ status: 'QUEUED' })).toBe(ResumeRunDecision.Resume)
  })

  it('resumes when status is missing so a transient payload does not look finished', () => {
    expect(decideResumeRun({ status: null })).toBe(ResumeRunDecision.Resume)
  })

  it('treats a successful Trigger run as completed', () => {
    expect(decideResumeRun({ status: 'COMPLETED' })).toBe(ResumeRunDecision.Completed)
  })

  it('fails on 404 or a terminal failure status', () => {
    expect(decideResumeRun({ statusCode: HttpStatus.NOT_FOUND, status: 'NOT_FOUND' })).toBe(
      ResumeRunDecision.Failed,
    )
    expect(decideResumeRun({ status: 'FAILED' })).toBe(ResumeRunDecision.Failed)
    expect(decideResumeRun({ status: 'CANCELED' })).toBe(ResumeRunDecision.Failed)
  })
})
