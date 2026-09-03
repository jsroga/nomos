import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  CanonAudience,
  emptyBeatDraftCanon,
  formatCanonFor,
} from '@/domains/storyteller/ai/workflows/beat-draft-canon'

const TWIST = 'THE_BELLS_ARE_VERA'
const FUTURE = 'FUTURE_SLOT_SECRET'

const CANON = emptyBeatDraftCanon({
  sections: {
    [BibleSection.WORLD_DESCRIPTION]: 'a harbour city',
    [BibleSection.PLOT_TWISTS]: [{ secret: TWIST }],
  },
  currentRoadmapSlotText: 'Vera confronts Marcus in the chapel',
  otherRoadmapSlotsText: FUTURE,
})

describe('formatCanonFor', () => {
  it('omits plot twists and future slots from Author', () => {
    const text = formatCanonFor(CanonAudience.Author, CANON, ['Vera'])
    expect(text).toContain('harbour')
    expect(text).toContain('Vera confronts Marcus')
    expect(text).not.toContain(TWIST)
    expect(text).not.toContain(FUTURE)
  })

  it('keeps twists for Planner and Continuity', () => {
    expect(formatCanonFor(CanonAudience.Planner, CANON, [])).toContain(TWIST)
    expect(formatCanonFor(CanonAudience.Continuity, CANON, [])).toContain(TWIST)
  })

  it('omits twists from Stakes', () => {
    expect(formatCanonFor(CanonAudience.Stakes, CANON, [])).not.toContain(TWIST)
  })
})
