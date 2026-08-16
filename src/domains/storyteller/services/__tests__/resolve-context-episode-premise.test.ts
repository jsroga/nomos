import { describe, expect, it } from 'vitest'
import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import { ContextAssemblyFallback } from '@/domains/storyteller/services/constants/context-assembly'
import {
  deriveProjectMeta,
  resolveContextEpisodePremise,
} from '@/domains/storyteller/services/context-assembly-parsers'

const LOGLINE = 'A clerk watches her own body age while the city ledger stays young.'
const PROTAGONIST_HOOK = 'She keeps the civic clocks honest and cannot look away from a lie.'
const FATAL_FLAW = 'She trusts the ledger more than her own pulse.'
const STAKES = 'If the clocks stay honest, the city must admit it is eating its people.'
const INEVITABLE = 'The next audit names her as the first expired asset.'
const TEN_POINTS = [
  'The clerk finds a birthday that never happened.',
  'A supervisor asks her to sign a blank year.',
  'She meets a man who claims he is already dead.',
  'The ledger prints her name in the debt column.',
  'She hides a second watch under the floor.',
  'A child asks why the sun sets twice.',
  'The city council votes to freeze all ages.',
  'She refuses to stamp the freeze.',
  'The ledger locks her out of her own file.',
  'She walks into the archive to age on purpose.',
]

describe('resolveContextEpisodePremise', () => {
  it('prefers episode story_plan.premise over an empty project plan', () => {
    const premise = resolveContextEpisodePremise({
      episodeStoryPlan: {
        premise: {
          [BeatboardPremiseFieldKey.Logline]: LOGLINE,
          [BeatboardPremiseFieldKey.ProtagonistHook]: PROTAGONIST_HOOK,
          [BeatboardPremiseFieldKey.FatalFlaw]: FATAL_FLAW,
          [BeatboardPremiseFieldKey.Stakes]: STAKES,
          [BeatboardPremiseFieldKey.InevitableConsequence]: INEVITABLE,
          [BeatboardPremiseFieldKey.TenPointsPlan]: TEN_POINTS,
          worldDescription: 'Should not reach the agent context block.',
        },
      },
      projectStoryPlan: {},
      bible: {},
    })

    expect(premise[BeatboardPremiseFieldKey.Logline]).toBe(LOGLINE)
    expect(premise[BeatboardPremiseFieldKey.TenPointsPlan]).toEqual(TEN_POINTS)
    expect(premise).not.toHaveProperty('worldDescription')
  })

  it('falls back to the project story plan when the episode has no premise', () => {
    const premise = resolveContextEpisodePremise({
      episodeStoryPlan: {},
      projectStoryPlan: {
        premise: { [BeatboardPremiseFieldKey.Logline]: LOGLINE },
      },
      bible: {},
    })

    expect(premise[BeatboardPremiseFieldKey.Logline]).toBe(LOGLINE)
  })

  it('fills logline and ten-point plan from episode columns', () => {
    const premise = resolveContextEpisodePremise({
      episodeStoryPlan: { premise: { [BeatboardPremiseFieldKey.FatalFlaw]: FATAL_FLAW } },
      episodePremiseText: LOGLINE,
      episodeTenPoints: TEN_POINTS,
      projectStoryPlan: {},
      bible: {},
    })

    expect(premise[BeatboardPremiseFieldKey.Logline]).toBe(LOGLINE)
    expect(premise[BeatboardPremiseFieldKey.FatalFlaw]).toBe(FATAL_FLAW)
    expect(premise[BeatboardPremiseFieldKey.TenPointsPlan]).toEqual(TEN_POINTS)
  })
})

describe('deriveProjectMeta', () => {
  it('uses the resolved episode premise instead of the project plan', () => {
    const meta = deriveProjectMeta(
      {},
      {},
      ContextAssemblyFallback.NotSet,
      ', ',
      { [BeatboardPremiseFieldKey.Logline]: LOGLINE }
    )

    expect(meta.premise[BeatboardPremiseFieldKey.Logline]).toBe(LOGLINE)
  })
})
