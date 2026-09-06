import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BEAT_DRAFT_CRITIC_ROLES } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import { RunTraceEventType } from '@/shared/agent-kernel/run-trace'

enum TraceContractFile {
  GhostRoute = 'src/app/api/storyteller/script/complete/route.ts',
  GhostComplete = 'src/domains/storyteller/core/io/complete-script-ghost.ts',
  GhostPack = 'src/domains/storyteller/core/io/complete-script-ghost-pack.ts',
  StartSection = 'src/domains/storyteller/core/io/start-manuscript-section-draft.ts',
}

enum GhostForbiddenToken {
  RoleDispatch = 'RoleDispatch',
  CritiqueContinuity = 'critiqueContinuity',
  CritiqueProse = 'critiqueProse',
  CritiqueStakes = 'critiqueStakes',
}

enum StartSectionToken {
  WorkflowId = 'BEAT_DRAFT_WORKFLOW_ID',
}

describe('manuscript generate-section vs ghost traces', () => {
  it('keeps three critic roles on the beat-draft path generate-section reuses', () => {
    expect(BEAT_DRAFT_CRITIC_ROLES).toHaveLength(3)
    const startSource = readFileSync(TraceContractFile.StartSection, 'utf8')
    expect(startSource).toContain(StartSectionToken.WorkflowId)
  })

  it('does not emit critic RoleDispatch from the ghost complete route', () => {
    for (const path of [
      TraceContractFile.GhostRoute,
      TraceContractFile.GhostComplete,
      TraceContractFile.GhostPack,
    ]) {
      const source = readFileSync(path, 'utf8')
      expect(source).not.toContain(GhostForbiddenToken.RoleDispatch)
      expect(source).not.toContain(RunTraceEventType.RoleDispatch)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueContinuity)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueProse)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueStakes)
    }
  })
})
