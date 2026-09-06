import { afterEach, describe, expect, it, vi } from 'vitest'
import { Mastra } from '@mastra/core/mastra'
import { RunTraceEventType, subscribeRunTrace, type RunTraceEvent } from '@/shared/agent-kernel'
import { FEATURE_FLAG_ON, FeatureFlag } from '@/shared/data/constants/feature-flags'
import { createBeatDraftWorkflow, type BeatDraftDeps } from '../beat-draft-workflow'
import {
  activeBeatDraftCriticRoles,
  BEAT_DRAFT_EXTRA_CRITIC_ROLES,
} from '../beat-draft-critic-roles'
import { BEAT_DRAFT_CRITIC_ROLES, BeatDraftCriticName } from '../constants/beat-draft-workflow'
import type { BeatPlan } from '../../agents/BeatPlanner/beat-plan-schema'
import { emptyBeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { CHAT_ROUTE_MAX_DURATION_SECONDS } from '@/shared/chat/core/constants/chat-timeouts'

const FAKE_PLAN: BeatPlan = {
  goal: 'Vera must extract the confession before the bells stop',
  conflict: 'Marcus stalls, knowing silence is his only shield',
  turn: 'The confession implicates Vera herself',
  dialogueHook: 'You already know what I did. You signed for it.',
  charactersInvolved: ['Vera', 'Marcus'],
}

function makeDeps(overrides: Partial<BeatDraftDeps> = {}): BeatDraftDeps {
  return {
    assembleCanon: vi.fn(async () => emptyBeatDraftCanon()),
    planBeat: vi.fn(async () => FAKE_PLAN),
    draftBeat: vi.fn(async () => 'INT. CHAPEL — DUSK\nVERA: You already know.'),
    runProseCheck: vi.fn(async () => []),
    critiqueContinuity: vi.fn(async () => '## Continuity\nNO FINDINGS.'),
    critiqueProse: vi.fn(async () => '## Prose findings\nNO FINDINGS.'),
    critiqueStakes: vi.fn(async () => '## Stakes\nNO FINDINGS.'),
    critiqueDialogue: vi.fn(async () => '## Dialogue\nNO FINDINGS.'),
    reviewStyleFidelity: vi.fn(async () => '## StyleFidelity\nNO FINDINGS.'),
    reviseBeat: vi.fn(async (_ctx, _canon, draft) => draft),
    humanizeBeat: vi.fn(async (_ctx, draft) => `${draft}\n[humanized]`),
    claimCheckBeat: vi.fn(() => ({ ok: true, missing: [], altered: [] })),
    persistBeat: vi.fn(async () => ({ saved: true, beatId: 'beat-123', message: 'saved' })),
    generateSparks: vi.fn(async () => []),
    ...overrides,
  }
}

function makeWorkflow(deps: BeatDraftDeps) {
  const workflow = createBeatDraftWorkflow(deps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  return workflow
}

const INPUT = {
  projectId: 'project-1',
  episodeId: 'episode-1',
  brief: 'Vera confronts Marcus about the ledger',
  characters: ['Vera', 'Marcus'],
}

describe('extra critic scopes', () => {
  const key = FeatureFlag.StorytellerExtraCriticScopes
  const prev = process.env[key]

  afterEach(() => {
    if (prev === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = prev
  })

  it('keeps the floor three when the extra-scope flag is off', () => {
    Reflect.deleteProperty(process.env, key)
    expect(BEAT_DRAFT_CRITIC_ROLES).toHaveLength(3)
    expect(activeBeatDraftCriticRoles()).toEqual([...BEAT_DRAFT_CRITIC_ROLES])
    expect(BEAT_DRAFT_EXTRA_CRITIC_ROLES).toEqual([BeatDraftCriticName.Dialogue])
  })

  it('emits zero extra RoleDispatch events when the flag is off', async () => {
    Reflect.deleteProperty(process.env, key)
    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    await run.start({ inputData: INPUT })
    stop()

    const criticRoles = new Set<string>([
      ...BEAT_DRAFT_CRITIC_ROLES,
      BeatDraftCriticName.Dialogue,
    ])
    const dispatched = events
      .filter(
        event =>
          event.type === RunTraceEventType.RoleDispatch &&
          event.role !== undefined &&
          criticRoles.has(event.role)
      )
      .map(event => event.role)
    expect(dispatched).toEqual([...BEAT_DRAFT_CRITIC_ROLES])
    expect(deps.critiqueDialogue).not.toHaveBeenCalled()
    expect(deps.humanizeBeat).not.toHaveBeenCalled()
  })

  it('appends Dialogue and still suspends when the flag is on', async () => {
    process.env[key] = FEATURE_FLAG_ON
    expect(activeBeatDraftCriticRoles()).toHaveLength(4)
    expect(activeBeatDraftCriticRoles().length).toBeLessThan(5)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS).toBe(180)

    const events: RunTraceEvent[] = []
    const stop = subscribeRunTrace(event => events.push(event))
    const deps = makeDeps()
    const workflow = makeWorkflow(deps)
    const run = await workflow.createRun()
    const result = await run.start({ inputData: INPUT })
    stop()

    expect(result.status).toBe('suspended')
    const criticRoles = new Set<string>([
      ...BEAT_DRAFT_CRITIC_ROLES,
      BeatDraftCriticName.Dialogue,
    ])
    const dispatched = events
      .filter(
        event =>
          event.type === RunTraceEventType.RoleDispatch &&
          event.role !== undefined &&
          criticRoles.has(event.role)
      )
      .map(event => event.role)
    expect(dispatched).toEqual([
      ...BEAT_DRAFT_CRITIC_ROLES,
      BeatDraftCriticName.Dialogue,
    ])
    expect(deps.critiqueDialogue).toHaveBeenCalledTimes(1)
    expect(deps.humanizeBeat).not.toHaveBeenCalled()
  })
})
