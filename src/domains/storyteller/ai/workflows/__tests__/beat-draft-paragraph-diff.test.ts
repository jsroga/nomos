import { describe, expect, it } from 'vitest'
import {
  formatParagraphDiff,
  ParagraphDiffLabel,
  splitParagraphs,
} from '../beat-draft-paragraph-diff'

describe('formatParagraphDiff', () => {
  it('marks removed and added paragraphs across a two-paragraph rewrite', () => {
    const before = 'First stays.\n\nSecond goes away.'
    const after = 'First stays.\n\nSecond is new wording.'
    const diff = formatParagraphDiff(before, after)
    expect(splitParagraphs(before)).toHaveLength(2)
    expect(diff).toContain(ParagraphDiffLabel.Header)
    expect(diff).toContain(`${ParagraphDiffLabel.Unchanged}First stays.`)
    expect(diff).toContain(`${ParagraphDiffLabel.Removed}Second goes away.`)
    expect(diff).toContain(`${ParagraphDiffLabel.Added}Second is new wording.`)
  })
})
