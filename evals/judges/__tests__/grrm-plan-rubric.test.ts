import { describe, expect, it } from 'vitest'
import { GrrmPlanRubricScorerId, scoreGrrmPlanRubric } from '../grrm-plan-rubric'

const WEAK = {
  goal: 'Talk about the problem',
  conflict: 'Talk about the problem',
  turn: 'Talk about the problem',
  dialogueHook: 'The truth is I am the one who forged the year. Let me explain.',
  charactersInvolved: ['Vera'],
}

const STRONG = {
  goal: 'Vera wants the wet ledger page before vespers.',
  conflict: 'Marcus holds the iron key and will not yield the drawer.',
  turn: 'Vera burns the page in candle smoke rather than let Marcus keep it.',
  dialogueHook: 'She slides the seal across with a trembling hand.',
  charactersInvolved: ['Vera', 'Marcus'],
}

describe('GRRM plan rubric', () => {
  it('scores a weak plan below a strong plan on the named axes', () => {
    const weak = scoreGrrmPlanRubric(WEAK)
    const strong = scoreGrrmPlanRubric(STRONG)
    expect(weak.id).toBe(GrrmPlanRubricScorerId.GrrmPlanRubric)
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.score).toBe(1)
    expect(weak.axes.withheldAuthorTruth).toBe(0)
    expect(weak.axes.lawOfMotionCompleteness).toBe(0)
  })
})
