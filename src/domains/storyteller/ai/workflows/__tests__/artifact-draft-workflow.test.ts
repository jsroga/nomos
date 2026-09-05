import { describe, expect, it, vi } from 'vitest'
import { Mastra } from '@mastra/core/mastra'
import { RunTraceEventType, subscribeRunTrace, type RunTraceEvent } from '@/shared/agent-kernel'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { BEAT_DRAFT_CRITIC_ROLES } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import type { ArtifactDraftDeps } from '../artifact-draft-deps-types'
import {
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ArtifactDraftStepId,
  ArtifactDraftVerdictAction,
  createArtifactDraftWorkflow,
} from '../artifact-draft-workflow'

function makeWorkflow(deps: ArtifactDraftDeps) {
  const workflow = createArtifactDraftWorkflow(deps)
  void new Mastra({ workflows: { artifactDraftWorkflow: workflow } })
  return workflow
}

function makeDeps(overrides: Partial<ArtifactDraftDeps> = {}): ArtifactDraftDeps {
  return {
    assemble: vi.fn(async () => ({ canonText: '{}', worldRules: [] })),
    checkDeterministic: vi.fn(async () => []),
    critique: vi.fn(async () => 'NO FINDINGS.'),
    persist: vi.fn(async () => ({ persisted: true, message: 'saved' })),
    ...overrides,
  }
}

const FACTION_INPUT = {
  projectId: 'project-1',
  kind: ArtifactKind.BibleSection,
  section: BibleSection.FACTIONS,
  draft: '[{ "name": "Wardens", "description": "They keep the marsh." }]',
}

describe('artifact-draft critic traces', () => {
  it('exports three beat-draft critic roles so deleting one still fails that contract', () => {
    expect(BEAT_DRAFT_CRITIC_ROLES).toHaveLength(3)
  })

  it('happy path emits 1 or 2 critic RoleDispatch events, never 3', async () => {
    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: FACTION_INPUT })
    stop()

    expect(result.status).toBe('suspended')
    const dispatches = events.filter(
      event =>
        event.type === RunTraceEventType.RoleDispatch &&
        event.stepId === ArtifactDraftStepId.Critique
    )
    expect(dispatches.length).toBeGreaterThanOrEqual(1)
    expect(dispatches.length).toBeLessThan(3)
    expect(deps.critique).toHaveBeenCalledTimes(dispatches.length)
    expect(deps.persist).not.toHaveBeenCalled()
  })

  it('Accept persist runs after resume; Reject does not persist', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: FACTION_INPUT })
    const accepted = await run.resume({
      step: ARTIFACT_DRAFT_VERDICT_STEP_ID,
      resumeData: { action: ArtifactDraftVerdictAction.Accept },
    })
    expect(accepted.status).toBe('success')
    expect(deps.persist).toHaveBeenCalledTimes(1)

    const rejectDeps = makeDeps()
    const rejectWorkflow = makeWorkflow(rejectDeps)
    const rejectRun = await rejectWorkflow.createRun()
    await rejectRun.start({ inputData: FACTION_INPUT })
    await rejectRun.resume({
      step: ARTIFACT_DRAFT_VERDICT_STEP_ID,
      resumeData: { action: ArtifactDraftVerdictAction.Reject },
    })
    expect(rejectDeps.persist).not.toHaveBeenCalled()
  })
})
