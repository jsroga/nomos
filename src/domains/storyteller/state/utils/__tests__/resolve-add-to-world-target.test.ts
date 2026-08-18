import { describe, expect, it } from 'vitest'
import {
  resolveAddToWorldCommit,
  resolveAddToWorldCommitTarget,
  resolveAddToWorldTarget,
} from '../resolve-add-to-world-target'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'

const SOUNDTRACK_PROSE = `
1. "Pyramid Song" — Radiohead
https://youtu.be/M6W4uhrLA7g
`

describe('resolveAddToWorldTarget', () => {
  it('does not mine soundtrack-shaped chat into the soundtrack panel', () => {
    const target = resolveAddToWorldTarget(SOUNDTRACK_PROSE, BibleSection.WORLD_DESCRIPTION)
    expect(target.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(target.actionType).toBe(ActionType.UPDATE_WORLD_DESCRIPTION)
  })

  it('dumps to Overview for Overview requests without a tool overlay', () => {
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

  it('uses moodSoundtrack when the Soundtrack panel is the requested section', () => {
    const target = resolveAddToWorldTarget('A rainy nocturne mood.', BibleSection.SOUNDTRACKS)
    expect(target).toEqual({
      section: BibleSection.SOUNDTRACKS,
      actionType: ActionType.UPDATE_SOUNDTRACKS,
      preview: { moodSoundtrack: 'A rainy nocturne mood.' },
    })
  })
})

describe('resolveAddToWorldCommitTarget', () => {
  it('writes pending tool prose to Overview instead of chat wrap-up', () => {
    expect(
      resolveAddToWorldCommitTarget(
        'The world of Aeternum is defined by a single impossible fact.',
        'I\'ll generate a rich world description.\n\nThe world bible is now live. Here\'s what I built.',
        undefined,
      )
    ).toEqual({
      section: BibleSection.WORLD_DESCRIPTION,
      actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
      preview: {
        worldDescription: 'The world of Aeternum is defined by a single impossible fact.',
      },
    })
  })

  it('returns null when there is no pending prose and chat chrome stripped empty', () => {
    expect(resolveAddToWorldCommitTarget(undefined, '', undefined)).toBeNull()
  })
})

describe('resolveAddToWorldCommit', () => {
  it('commits tool premise to the episode panel instead of Overview', () => {
    const premise = { logline: 'A clerk discovers the ledger writes her name in advance.' }
    expect(
      resolveAddToWorldCommit({
        episodePremise: premise,
        overviewProse: 'The world of Aeternum is defined by a single impossible fact.',
        cleanedChat: 'I\'ll generate a rich episode premise.',
        requestedSection: undefined,
      }),
    ).toEqual({
      section: BibleSection.EPISODE_PREMISE,
      actionType: ActionType.UPDATE_EPISODE_PREMISE,
      preview: { premise },
    })
  })

  it('does not dump episode-turn chat wrap-up into Overview', () => {
    expect(
      resolveAddToWorldCommit({
        cleanedChat: '',
        requestedSection: BibleSection.EPISODE_PREMISE,
      }),
    ).toBeNull()
  })
})
