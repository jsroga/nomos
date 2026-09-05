import { describe, expect, it } from 'vitest'
import {
  AUTHOR_LABELLED_PLANS_DATASET,
  AuthorLabelledPlanClass,
  authorLabelledPlansContentHash,
  sampleAuthorLabelledPlans,
} from '../datasets/author-labelled-plans'
import { hashFromEntries } from '../input-hash.mjs'

describe('author-labelled-plans', () => {
  it('has one stub per labelled plan class', () => {
    const classes = new Set(AUTHOR_LABELLED_PLANS_DATASET.stubs.map(stub => stub.planClass))
    expect([...classes].sort()).toEqual(Object.values(AuthorLabelledPlanClass).sort())
    expect(AUTHOR_LABELLED_PLANS_DATASET.stubs).toHaveLength(7)
  })

  it('same seed → same sample', () => {
    const a = sampleAuthorLabelledPlans(42, 7).map(stub => stub.id)
    const b = sampleAuthorLabelledPlans(42, 7).map(stub => stub.id)
    expect(a).toEqual(b)
  })

  it('changing one labelled plan changes the content hash fingerprint', () => {
    const before = authorLabelledPlansContentHash()
    const hashBefore = hashFromEntries([{ path: 'evals/datasets/author-labelled-plans.ts', content: before }])
    const hashAfter = hashFromEntries([
      { path: 'evals/datasets/author-labelled-plans.ts', content: `${before}\nCHANGED` },
    ])
    expect(hashAfter).not.toBe(hashBefore)
  })
})
