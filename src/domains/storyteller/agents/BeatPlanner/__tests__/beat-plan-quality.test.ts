import { describe, expect, it } from 'vitest'
import { assessBeatPlanConcreteness, formatPlanQualityFeedback } from '../beat-plan-quality'
import type { BeatPlan } from '../beat-plan-schema'

const CONCRETE_PLAN: BeatPlan = {
  goal: 'Vera must extract the confession before the bells stop ringing',
  conflict: 'Marcus stalls her with the ledger, knowing silence is his only shield',
  turn: 'The confession implicates Vera herself — her signature is on the transfer',
  dialogueHook: 'You already know what I did. You signed for it.',
  charactersInvolved: ['Vera', 'Marcus'],
}

describe('assessBeatPlanConcreteness', () => {
  it('passes a concrete plan', () => {
    const result = assessBeatPlanConcreteness(CONCRETE_PLAN, ['Vera', 'Marcus'])
    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('fails fields under the length floor', () => {
    const result = assessBeatPlanConcreteness({ ...CONCRETE_PLAN, goal: 'Vera wins' })
    expect(result.ok).toBe(false)
    expect(result.failures.some(f => f.startsWith('goal is too thin'))).toBe(true)
  })

  it('fails banned vagueness phrases case-insensitively', () => {
    const result = assessBeatPlanConcreteness({
      ...CONCRETE_PLAN,
      turn: 'Marcus realizes Everything Changes for the family after tonight',
    })
    expect(result.ok).toBe(false)
    expect(result.failures.some(f => f.includes('"everything changes"'))).toBe(true)
  })

  it('fails when no character is named in goal/conflict/turn', () => {
    const result = assessBeatPlanConcreteness({
      ...CONCRETE_PLAN,
      goal: 'The confession must be extracted before the bells stop ringing',
      conflict: 'The suspect stalls, knowing silence is the only remaining shield',
      turn: 'The confession implicates the interrogator — the signature is on the transfer',
    })
    expect(result.ok).toBe(false)
    expect(result.failures.some(f => f.includes('names a character'))).toBe(true)
  })

  it('skips the character check when no names are known', () => {
    const result = assessBeatPlanConcreteness(
      {
        ...CONCRETE_PLAN,
        goal: 'The confession must be extracted before the bells stop ringing',
        conflict: 'The suspect stalls, knowing silence is the only remaining shield',
        turn: 'The confession implicates the interrogator via the signed transfer',
        charactersInvolved: [' '],
      },
      []
    )
    expect(result.ok).toBe(true)
  })

  it('collects multiple failures at once', () => {
    const result = assessBeatPlanConcreteness({
      ...CONCRETE_PLAN,
      goal: 'win',
      conflict: 'Something happens and then tension rises around the whole family estate',
    })
    expect(result.failures.length).toBeGreaterThanOrEqual(2)
  })
})

describe('formatPlanQualityFeedback', () => {
  it('renders failures as bullets', () => {
    expect(formatPlanQualityFeedback(['a', 'b'])).toBe('- a\n- b')
  })
})
