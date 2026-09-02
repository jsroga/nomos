/**
 * beat-draft-workflow mechanics — suspend/resume/verdict logic with injected
 * fake deps. No LLM calls, no database, no API keys (StoryForge `mechanics`
 * tier): these tests pin the riskiest new machinery — the editorial-verdict
 * gate — independent of model quality.
 */

import { describe, expect, it, vi } from 'vitest'
import { Mastra } from '@mastra/core/mastra'
import { recordFromJson } from '@/shared/data/deep-merge'
import { RunTraceEventType, subscribeRunTrace, type RunTraceEvent } from '@/shared/agent-kernel'
import {
  createBeatDraftWorkflow,
  type BeatDraftDeps,
} from '../beat-draft-workflow'
import { VERDICT_STEP_ID, beatDraftOutputSchema } from '../beat-draft-contract'
import type { BeatPlan } from '../../agents/BeatPlanner/beat-plan-schema'

function suspendPayload(
  steps: Record<string, { suspendPayload?: unknown } | undefined> | undefined,
  stepId: string
): Record<string, unknown> | undefined {
  const raw = steps?.[stepId]?.suspendPayload
  if (raw == null) return undefined
  return recordFromJson(raw)
}

/**
 * Suspend snapshots need a Mastra binding — a throwaway test instance with
 * default in-memory storage (the production one-instance rule applies to
 * runtime code, not test fixtures).
 */
function makeWorkflow(deps: BeatDraftDeps) {
  const workflow = createBeatDraftWorkflow(deps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  return workflow
}

const FAKE_PLAN: BeatPlan = {
  goal: 'Vera must extract the confession before the bells stop',
  conflict: 'Marcus stalls, knowing silence is his only shield',
  turn: 'The confession implicates Vera herself',
  dialogueHook: 'You already know what I did. You signed for it.',
  charactersInvolved: ['Vera', 'Marcus'],
}

function makeDeps(overrides: Partial<BeatDraftDeps> = {}) {
  const deps: BeatDraftDeps = {
    assembleCanon: vi.fn(async () => 'CANON: the bells ring at dusk'),
    planBeat: vi.fn(async () => FAKE_PLAN),
    draftBeat: vi.fn(async () => 'INT. CHAPEL — DUSK\nVERA: You already know.'),
    critiqueContinuity: vi.fn(async () => '## Continuity\nNO FINDINGS.'),
    critiqueProse: vi.fn(async () => '## Prose findings\nNO FINDINGS.'),
    critiqueStakes: vi.fn(async () => '## Stakes\nNO FINDINGS.'),
    reviseBeat: vi.fn(async (_ctx, _canon, draft, _critiques, note) =>
      note ? `${draft}\n[revised per: ${note}]` : `${draft}\n[revised]`
    ),
    persistBeat: vi.fn(async () => ({ saved: true, beatId: 'beat-123', message: 'saved' })),
    generateSparks: vi.fn(async () => []),
    ...overrides,
  }
  return deps
}

const INPUT = {
  projectId: 'project-1',
  episodeId: 'episode-1',
  brief: 'Vera confronts Marcus about the ledger',
  characters: ['Vera', 'Marcus'],
}

describe('beat-draft-workflow mechanics (no LLM)', () => {
  it('suspends at the editorial verdict with draft + critiques in the payload', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, VERDICT_STEP_ID)
    expect(payload?.draft).toContain('INT. CHAPEL')
    expect(payload?.critiques).toContain('NO FINDINGS')
    expect(deps.persistBeat).not.toHaveBeenCalled()
  })

  it('resume(approve) revises and persists the beat', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'approve' },
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = beatDraftOutputSchema.parse(result.result)
    expect(output.killed).toBe(false)
    expect(output.saved).toBe(true)
    expect(output.beatId).toBe('beat-123')
    expect(output.finalDraft).toContain('[revised]')
    expect(deps.reviseBeat).toHaveBeenCalledTimes(1)
    expect(deps.persistBeat).toHaveBeenCalledTimes(1)
  })

  it('resume(revise + note) passes the editor note to the author', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'revise', note: 'More subtext, less confession' },
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = beatDraftOutputSchema.parse(result.result)
    expect(output.finalDraft).toContain('More subtext, less confession')
    expect(deps.reviseBeat).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 'episode-1' }),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'More subtext, less confession'
    )
  })

  it('resume(kill) discards the draft — nothing revised, nothing persisted', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'kill' },
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = beatDraftOutputSchema.parse(result.result)
    expect(output.killed).toBe(true)
    expect(output.saved).toBe(false)
    expect(output.finalDraft).toBe('')
    expect(deps.reviseBeat).not.toHaveBeenCalled()
    expect(deps.persistBeat).not.toHaveBeenCalled()
  })

  it('autoApprove skips the verdict gate and completes in one run', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: { ...INPUT, autoApprove: true } })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('unreachable')
    const output = beatDraftOutputSchema.parse(result.result)
    expect(output.saved).toBe(true)
    expect(output.killed).toBe(false)
    expect(deps.reviseBeat).toHaveBeenCalledTimes(1)
  })

  it('propagates step failures as a failed run (planner throws)', async () => {
    const deps = makeDeps({
      planBeat: vi.fn(async () => {
        throw new Error('planner unavailable')
      }),
    })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(result.status).toBe('failed')
    expect(deps.draftBeat).not.toHaveBeenCalled()
  })
})

const VAGUE_PLAN: BeatPlan = {
  goal: 'win',
  conflict: 'Something happens and then tension rises around the estate',
  turn: 'Everything changes for everyone involved in the situation',
  dialogueHook: 'We need to talk.',
  charactersInvolved: ['Vera'],
}

describe('beat-plan concreteness gate (item 35)', () => {
  it('retries the planner once with the failures named, then proceeds clean', async () => {
    const planBeat = vi
      .fn<BeatDraftDeps['planBeat']>()
      .mockResolvedValueOnce(VAGUE_PLAN)
      .mockResolvedValueOnce(FAKE_PLAN)
    const deps = makeDeps({ planBeat })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(planBeat).toHaveBeenCalledTimes(2)
    // Retry call carries the named failures.
    const retryFeedback = planBeat.mock.calls[1][2]
    expect(retryFeedback).toContain('goal is too thin')
    expect(retryFeedback).toContain('tension rises')

    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, VERDICT_STEP_ID)
    expect(payload?.planWarnings).toBeUndefined()
  })

  it('flags planWarnings in the suspend payload when the retry also fails', async () => {
    const planBeat = vi.fn(async () => VAGUE_PLAN)
    const deps = makeDeps({ planBeat })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(planBeat).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, VERDICT_STEP_ID)
    expect(Array.isArray(payload?.planWarnings)).toBe(true)
    expect(String(payload?.planWarnings)).toContain('goal is too thin')
    // The vague plan still flows through — flagged, not fatal.
    expect(deps.draftBeat).toHaveBeenCalled()
  })
})

describe('Muse sparks wiring (item 5.3)', () => {
  const KEPT_SPARK = {
    idea: {
      hook: 'Vera burns the ledger page she came to steal',
      mechanism: 'The candle is the instrumental object; vespers are the countdown.',
      collision: 'Destroys the evidence both factions need.',
    },
    scores: { surprise: 8, storyMotion: 9, fit: 7, cost: 8 },
    verdict: 'keep' as const,
    reason: 'Irreversible and collides with the ledger plot',
  }

  it('feeds ranked sparks to the planner and surfaces them at the verdict', async () => {
    const deps = makeDeps({ generateSparks: vi.fn(async () => [KEPT_SPARK]) })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: { ...INPUT, wildcards: true } })

    expect(deps.generateSparks).toHaveBeenCalledTimes(1)
    // planBeat received the sparks block (4th arg) containing the hook.
    const planBeatCall = vi.mocked(deps.planBeat).mock.calls[0]
    expect(String(planBeatCall[3])).toContain(KEPT_SPARK.idea.hook)

    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, VERDICT_STEP_ID)
    expect(payload?.sparks).toEqual([KEPT_SPARK.idea.hook])
  })

  it('never runs the Muse when wildcards is off', async () => {
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })

    expect(deps.generateSparks).not.toHaveBeenCalled()
    expect(result.status).toBe('suspended')
    const payload = suspendPayload(result.steps, VERDICT_STEP_ID)
    expect(payload?.sparks).toBeUndefined()
  })
})

describe('beat-draft-workflow contracts', () => {
  it('one run.start is one workflow and dispatches the planner once', async () => {
    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })
    stop()

    expect(result.status).toBe('suspended')
    expect(deps.planBeat).toHaveBeenCalledTimes(1)
    expect(events.filter(event => event.type === RunTraceEventType.RoleDispatch).length).toBeGreaterThanOrEqual(1)
    expect(events.some(event => event.type === RunTraceEventType.PersistCommit)).toBe(false)
  })

  it('invokes three critics in parallel before suspend', async () => {
    const started: number[] = []
    const ended: number[] = []
    const delay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const deps = makeDeps({
      critiqueContinuity: vi.fn(async () => {
        started.push(Date.now())
        await delay(40)
        ended.push(Date.now())
        return 'c'
      }),
      critiqueProse: vi.fn(async () => {
        started.push(Date.now())
        await delay(40)
        ended.push(Date.now())
        return 'p'
      }),
      critiqueStakes: vi.fn(async () => {
        started.push(Date.now())
        await delay(40)
        ended.push(Date.now())
        return 's'
      }),
    })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })

    expect(deps.critiqueContinuity).toHaveBeenCalledTimes(1)
    expect(deps.critiqueProse).toHaveBeenCalledTimes(1)
    expect(deps.critiqueStakes).toHaveBeenCalledTimes(1)
    expect(started).toHaveLength(3)
    expect(Math.max(...started)).toBeLessThanOrEqual(Math.min(...ended))
  })

  it('kill emits no persist.commit', async () => {
    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })
    await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'kill' },
    })
    stop()

    expect(deps.persistBeat).not.toHaveBeenCalled()
    expect(events.some(event => event.type === RunTraceEventType.PersistCommit)).toBe(false)
  })

  it('persist throw fails the run', async () => {
    const deps = makeDeps({
      persistBeat: vi.fn(async () => {
        throw new Error('save missed')
      }),
    })
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })
    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'approve' },
    })

    expect(result.status).toBe('failed')
  })

  it('approve path traces persist.commit', async () => {
    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })
    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: { action: 'approve' },
    })
    stop()

    expect(result.status).toBe('success')
    expect(events.some(event => event.type === RunTraceEventType.PersistCommit)).toBe(true)
  })
})
