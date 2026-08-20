/**
 * fix-inconsistencies-workflow mechanics — suspend/resume with injected fake
 * deps. No LLM calls, no database.
 */

import { describe, expect, it, vi } from 'vitest'
import { Mastra } from '@mastra/core/mastra'
import { recordFromJson } from '@/shared/data/deep-merge'
import {
  createFixInconsistenciesWorkflow,
} from '../fix-inconsistencies-workflow'
import type { FixInconsistenciesDeps } from '../fix-inconsistencies-deps-types'
import {
  FIX_INCONSISTENCIES_VERDICT_STEP,
  fixInconsistenciesOutputSchema,
} from '../fix-inconsistencies-contract'
import {
  ContinuityAffectedKind,
  ContinuityFindingSeverity,
  ContinuityFindingType,
  type ConsistencyFixItem,
  type ContinuityFinding,
} from '../fix-inconsistencies-schema'
import { FixInconsistenciesVerdictAction } from '../constants/fix-inconsistencies-workflow'
import type { AssembledCanon } from '../fix-inconsistencies-contract'

function suspendPayload(
  steps: Record<string, { suspendPayload?: unknown } | undefined> | undefined,
  stepId: string
): Record<string, unknown> | undefined {
  const raw = steps?.[stepId]?.suspendPayload
  if (raw == null) return undefined
  return recordFromJson(raw)
}

function makeWorkflow(deps: FixInconsistenciesDeps) {
  const workflow = createFixInconsistenciesWorkflow(deps)
  void new Mastra({ workflows: { fixInconsistenciesWorkflow: workflow } })
  return workflow
}

const FINDING: ContinuityFinding = {
  id: 'f-1',
  type: ContinuityFindingType.Character,
  severity: ContinuityFindingSeverity.Major,
  quote: 'Vera is left-handed',
  why: 'Bible says she is right-handed',
  affected: [
    {
      kind: ContinuityAffectedKind.Character,
      id: 'char-1',
      fieldPath: 'description',
    },
  ],
  patchable: true,
}

const FIX: ConsistencyFixItem = {
  id: 'fix-1',
  inconsistencyId: 'f-1',
  targetElement: { type: ContinuityAffectedKind.Character, id: 'char-1' },
  changes: [
    { path: 'description', before: 'left-handed', after: 'right-handed', reason: 'Match bible' },
  ],
}

const CANON: AssembledCanon = {
  empty: false,
  projectId: 'project-1',
  bibleJson: '{}',
  charactersJson: '[]',
  worldRulesJson: '[]',
  sectionsJson: {},
  episodes: [
    {
      episodeId: 'ep-1',
      title: 'One',
      sequence: 1,
      premiseJson: '{}',
      beatsJson: '[{}]',
    },
  ],
  bibleLocked: false,
  lockedBeatIds: [],
  lockedCharacterIds: [],
}

function makeDeps(overrides: Partial<FixInconsistenciesDeps> = {}): FixInconsistenciesDeps {
  return {
    assembleCanon: vi.fn(async () => CANON),
    structuralScan: vi.fn(async () => ({ issues: [] })),
    agenticScan: vi.fn(async () => [FINDING]),
    proposeFixes: vi.fn(async () => [FIX]),
    applyFixes: vi.fn(async () => ({ appliedCount: 1, undoId: 'undo-1' })),
    filterLocked: vi.fn((_canon, _findings, fixes) => ({ fixes, skipped: [] })),
    ...overrides,
  }
}

const INPUT = { projectId: 'project-1' }

describe('fix-inconsistencies-workflow mechanics (no LLM)', () => {
  it('suspends with findings and fixes for apply-all / discard-all', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, FIX_INCONSISTENCIES_VERDICT_STEP)
    expect(payload?.findings).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'f-1' })]))
    expect(payload?.fixes).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'fix-1' })]))
    expect(deps.applyFixes).not.toHaveBeenCalled()
  })

  it('resume(apply) cascade-applies patches', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    const result = await run.resume({
      step: FIX_INCONSISTENCIES_VERDICT_STEP,
      resumeData: { action: FixInconsistenciesVerdictAction.Apply },
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = fixInconsistenciesOutputSchema.parse(result.result)
    expect(output.discarded).toBe(false)
    expect(output.appliedCount).toBe(1)
    expect(output.undoId).toBe('undo-1')
    expect(deps.applyFixes).toHaveBeenCalledTimes(1)
  })

  it('resume(discard) writes nothing', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    const result = await run.resume({
      step: FIX_INCONSISTENCIES_VERDICT_STEP,
      resumeData: { action: FixInconsistenciesVerdictAction.Discard },
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = fixInconsistenciesOutputSchema.parse(result.result)
    expect(output.discarded).toBe(true)
    expect(output.appliedCount).toBe(0)
    expect(deps.applyFixes).not.toHaveBeenCalled()
  })

  it('empty corpus skips LLM and completes without suspend', async () => {
    const deps = makeDeps({
      assembleCanon: vi.fn(async () => ({ ...CANON, empty: true, episodes: [] })),
      agenticScan: vi.fn(async () => []),
      proposeFixes: vi.fn(async () => []),
    })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = fixInconsistenciesOutputSchema.parse(result.result)
    expect(output.empty).toBe(true)
    expect(output.discarded).toBe(true)
    expect(deps.agenticScan).not.toHaveBeenCalled()
    expect(deps.proposeFixes).not.toHaveBeenCalled()
    expect(deps.applyFixes).not.toHaveBeenCalled()
  })

  it('autoApprove applies without suspend', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: { ...INPUT, autoApprove: true } })

    expect(result.status).toBe('success')
    expect(deps.applyFixes).toHaveBeenCalledTimes(1)
  })
})
