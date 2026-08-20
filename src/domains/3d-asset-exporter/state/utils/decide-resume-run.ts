import { HttpStatus } from '@/shared/data/constants/protocol'
import { isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'

export enum ResumeRunDecision {
  Resume = 'resume',
  Completed = 'completed',
  Failed = 'failed',
}

export function decideResumeRun(statusData: {
  statusCode?: number
  status?: string | null
}): ResumeRunDecision {
  if (statusData.statusCode === HttpStatus.NOT_FOUND) {
    return ResumeRunDecision.Failed
  }

  const status = statusData.status
  if (!status || isActiveTaskStatus(status)) {
    return ResumeRunDecision.Resume
  }
  if (isSuccessTaskStatus(status)) {
    return ResumeRunDecision.Completed
  }
  return ResumeRunDecision.Failed
}
