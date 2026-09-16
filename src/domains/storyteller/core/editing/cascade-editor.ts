import type {
  AppliedFix,
  CascadeResult,
  ConsistencyFix,
} from '@/domains/storyteller/core/types/consistency-types'
import { jobContextScope } from '@/shared/auth/project-scope'
import {
  applyCascadingFixes as applyCascadingFixesForScope,
  revertFix as revertFixForScope,
} from '@/domains/storyteller/services/apply-cascading-fixes'

export async function applyCascadingFixes(
  fixes: ConsistencyFix[],
  projectId: string,
  episodeId?: string
): Promise<CascadeResult> {
  return applyCascadingFixesForScope(fixes, jobContextScope(projectId), episodeId)
}

export async function revertFix(
  fix: AppliedFix,
  projectId: string,
  episodeId?: string
): Promise<void> {
  return revertFixForScope(fix, jobContextScope(projectId), episodeId)
}
