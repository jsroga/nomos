import { describe, expect, it } from 'vitest'
import { resolveAddToWorldTarget } from '../resolve-add-to-world-target'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'

const SOUNDTRACK_PROSE = `
1. "Pyramid Song" — Radiohead
https://youtu.be/M6W4uhrLA7g
`

const INSPIRATION_PROSE = `
🎬 MOVIES
1. The Third Man (1949) — Carol Reed's noir masterpiece.

📚 BOOKS
2. Dune — Desert power politics.
`

describe('resolveAddToWorldTarget', () => {
  it('prefers soundtrack extract even when Overview was the last panel', () => {
    const target = resolveAddToWorldTarget(SOUNDTRACK_PROSE, BibleSection.WORLD_DESCRIPTION)
    expect(target.section).toBe(BibleSection.SOUNDTRACKS)
    expect(target.actionType).toBe(ActionType.UPDATE_SOUNDTRACKS)
  })

  it('prefers inspirations extract even when Overview was the last panel', () => {
    const target = resolveAddToWorldTarget(INSPIRATION_PROSE, BibleSection.WORLD_DESCRIPTION)
    expect(target.section).toBe(BibleSection.INSPIRATIONS)
    expect(target.actionType).toBe(ActionType.UPDATE_INSPIRATIONS)
  })

  it('dumps to Overview for Overview requests without structured shape', () => {
    const target = resolveAddToWorldTarget(
      'A rewritten world overview paragraph.',
      BibleSection.WORLD_DESCRIPTION
    )
    expect(target).toEqual({
      section: BibleSection.WORLD_DESCRIPTION,
      actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
      preview: { worldDescription: 'A rewritten world overview paragraph.' },
    })
  })

  it('falls back to Overview for free-form prose so Add to world never no-ops', () => {
    expect(resolveAddToWorldTarget('Thanks for the notes on the city.', undefined)).toEqual({
      section: BibleSection.WORLD_DESCRIPTION,
      actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
      preview: { worldDescription: 'Thanks for the notes on the city.' },
    })
  })

  it('uses moodSoundtrack when Soundtrack panel asked but extract found nothing', () => {
    const target = resolveAddToWorldTarget('A rainy nocturne mood.', BibleSection.SOUNDTRACKS)
    expect(target).toEqual({
      section: BibleSection.SOUNDTRACKS,
      actionType: ActionType.UPDATE_SOUNDTRACKS,
      preview: { moodSoundtrack: 'A rainy nocturne mood.' },
    })
  })
})
