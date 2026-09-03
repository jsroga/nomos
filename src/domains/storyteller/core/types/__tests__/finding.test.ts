import { describe, expect, it } from 'vitest'
import {
  FindingSchema,
  FindingSeverity,
  ProblemType,
} from '@/domains/storyteller/core/types/finding'

const VALID = {
  location: { beatId: 'draft', paragraph: 0, quote: 'the bells are Vera' },
  problemType: ProblemType.ViewpointOverreach,
  whatHappensNow: 'The draft names a twist the POV cannot know.',
  whyItFails: 'Author-truth token appears in character-facing prose.',
  revisionDirection: 'Cut the secret or filter it through what Vera can observe.',
  severity: FindingSeverity.Error,
  promoteToProjectRule: false,
}

describe('FindingSchema', () => {
  it('parses a complete finding', () => {
    expect(FindingSchema.parse(VALID).location.quote).toBe('the bells are Vera')
  })

  it('rejects a missing quote', () => {
    expect(() =>
      FindingSchema.parse({
        ...VALID,
        location: { beatId: 'draft', paragraph: 0, quote: '' },
      })
    ).toThrow()
  })

  it('rejects a vague object without location', () => {
    expect(() =>
      FindingSchema.parse({ whyItFails: 'pacing', severity: FindingSeverity.Warning })
    ).toThrow()
  })
})
