import { describe, expect, it } from 'vitest'
import {
  AUTHOR_LABELLED_BEATS_DATASET,
  AuthorLabelledBeatClass,
  authorLabelledBeatsContentHash,
  sampleAuthorLabelledBeats,
} from '../datasets/author-labelled-beats'
import { hashFromEntries } from '../input-hash.mjs'

describe('author-labelled-beats', () => {
  it('has one stub per Action 20 class', () => {
    const classes = new Set(AUTHOR_LABELLED_BEATS_DATASET.stubs.map(stub => stub.beatClass))
    expect([...classes].sort()).toEqual(Object.values(AuthorLabelledBeatClass).sort())
    expect(AUTHOR_LABELLED_BEATS_DATASET.stubs).toHaveLength(7)
  })

  it('same seed → same sample', () => {
    const a = sampleAuthorLabelledBeats(42, 7).map(stub => stub.id)
    const b = sampleAuthorLabelledBeats(42, 7).map(stub => stub.id)
    expect(a).toEqual(b)
  })

  it('changing one labelled beat changes the content hash fingerprint', () => {
    const before = authorLabelledBeatsContentHash()
    const entriesBefore = [{ path: 'evals/datasets/author-labelled-beats.ts', content: before }]
    const hashBefore = hashFromEntries(entriesBefore)
    const altered = `${before}\nCHANGED`
    const hashAfter = hashFromEntries([
      { path: 'evals/datasets/author-labelled-beats.ts', content: altered },
    ])
    expect(hashAfter).not.toBe(hashBefore)
  })
})
