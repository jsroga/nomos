import { describe, expect, it } from 'vitest'
import { hydrationSignatureOf } from '../hydration-signature'

const PROJECT_ID = 'p1'

function project(storyPlan: Record<string, unknown>, seriesBible: Record<string, unknown> = {}) {
  return { id: PROJECT_ID, story_plan: storyPlan, series_bible: seriesBible }
}

const TWIST = { title: 'The Stillness Was Meant to End', description: 'A failsafe, not a gift.' }

describe('hydrationSignatureOf', () => {
  it('changes when only plotTwists arrive', () => {
    // The reported bug: twists landed in a later payload, the key did not move,
    // so the hydration effect never re-ran and the panel stayed empty.
    const before = hydrationSignatureOf(project({ worldDescription: 'w' }))
    const after = hydrationSignatureOf(project({ worldDescription: 'w', plotTwists: [TWIST] }))
    expect(after).not.toBe(before)
  })

  it('changes when a plot twist is edited in place', () => {
    const before = hydrationSignatureOf(project({ plotTwists: [TWIST] }))
    const after = hydrationSignatureOf(
      project({ plotTwists: [{ ...TWIST, description: 'rewritten' }] })
    )
    expect(after).not.toBe(before)
  })

  it.each([
    ['factions', { factions: [{ name: 'The Tallybone', description: 'd' }] }],
    ['items', { items: [{ name: 'Scar ledger', description: 'd' }] }],
    ['events', { events: [{ name: 'The Stillness', description: 'd' }] }],
    ['inspirations', { inspirations: { books: [{ title: 'b', description: 'd' }] } }],
    ['cast', { cast: [{ name: 'Sera' }] }],
    ['soundtracks', { soundtracks: [{ title: 't', artist: 'a', youtubeUrl: 'u' }] }],
  ])('changes when only %s arrives', (_label, added) => {
    const before = hydrationSignatureOf(project({ worldDescription: 'w' }))
    const after = hydrationSignatureOf(project({ worldDescription: 'w', ...added }))
    expect(after).not.toBe(before)
  })

  it('changes when content arrives on the series bible rather than the plan', () => {
    const before = hydrationSignatureOf(project({}, {}))
    const after = hydrationSignatureOf(project({}, { plotTwists: [TWIST] }))
    expect(after).not.toBe(before)
  })

  it('is stable for identical payloads', () => {
    const first = hydrationSignatureOf(project({ plotTwists: [TWIST] }))
    const second = hydrationSignatureOf(project({ plotTwists: [TWIST] }))
    expect(second).toBe(first)
  })

  it('is null without a project id, so hydration stays gated', () => {
    expect(hydrationSignatureOf(null)).toBeNull()
    expect(hydrationSignatureOf({ story_plan: { plotTwists: [TWIST] } })).toBeNull()
  })
})
