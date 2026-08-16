import { describe, expect, it } from 'vitest'
import {
  BeatboardPremiseRequirement,
  BeatboardPremiseValidationCopy,
} from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import {
  episodePremiseFromPlan,
  validatePremiseForBeatboard,
} from '../validate-premise-for-beatboard'

const TEN_POINTS = [
  'Routine morning at the clinic',
  'The impossible body arrives',
  'Cover-up order from the board',
  'Protagonist hides the chart',
  'Rival doctor smells the lie',
  'Family arrives demanding answers',
  'The ledger names the protagonist',
  'Public accusation in the ward',
  'Burn the book or read the page',
  'The clinic is no longer theirs',
]

function detailedPremise() {
  return {
    logline: 'A night clerk must hide a body that ages backward before dawn.',
    protagonistHook: 'Mara opens the clinic and finds a patient younger than last night.',
    fatalFlaw: 'She trusts the ledger more than her own eyes.',
    stakes: 'If the board learns, the clinic is seized and her sister stays missing.',
    inevitableConsequence: 'The ledger writes her name and the clinic belongs to the board.',
    tenPointsPlan: TEN_POINTS,
  }
}

describe('episodePremiseFromPlan', () => {
  it('reads a nested premise object', () => {
    const nested = { logline: 'A clerk hides a body.' }
    expect(episodePremiseFromPlan({ premise: nested, title: 'Ep 1' })).toEqual(nested)
  })

  it('falls back to flattened plan fields', () => {
    const plan = { logline: 'A clerk hides a body.', title: 'Ep 1' }
    expect(episodePremiseFromPlan(plan)).toEqual(plan)
  })

  it('returns null for an empty plan', () => {
    expect(episodePremiseFromPlan(null)).toBeNull()
  })
})

describe('validatePremiseForBeatboard', () => {
  it('accepts a full Ozymandias premise with eight or more plan beats', () => {
    expect(validatePremiseForBeatboard(detailedPremise())).toEqual({ ok: true })
  })

  it('rejects a missing premise', () => {
    const result = validatePremiseForBeatboard(null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe(BeatboardPremiseValidationCopy.NoPremise)
  })

  it('rejects a logline-only premise and lists the missing fields', () => {
    const result = validatePremiseForBeatboard({
      logline: 'A night clerk must hide a body that ages backward before dawn.',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.missing).toEqual([
      BeatboardPremiseRequirement.ProtagonistHook,
      BeatboardPremiseRequirement.FatalFlaw,
      BeatboardPremiseRequirement.Stakes,
      BeatboardPremiseRequirement.InevitableConsequence,
      BeatboardPremiseRequirement.TenPointsPlan,
    ])
    expect(result.message).toContain(BeatboardPremiseValidationCopy.TooThin)
    expect(result.message).toContain(BeatboardPremiseRequirement.TenPointsPlan)
  })

  it('rejects a short 10-point plan even when pillars are filled', () => {
    const result = validatePremiseForBeatboard({
      ...detailedPremise(),
      tenPointsPlan: TEN_POINTS.slice(0, 3),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.missing).toEqual([BeatboardPremiseRequirement.TenPointsPlan])
  })

  it('counts object-shaped ten-point entries', () => {
    const result = validatePremiseForBeatboard({
      ...detailedPremise(),
      tenPointsPlan: TEN_POINTS.map(description => ({ description })),
    })
    expect(result).toEqual({ ok: true })
  })
})
