import { describe, expect, it } from 'vitest'
import { MasterPromptFieldCopy } from '../constants/master-prompt-field'
import { formatMasterPromptCharCount } from '../format-master-prompt-char-count'

describe('formatMasterPromptCharCount', () => {
  it('formats the clamped footer count', () => {
    expect(formatMasterPromptCharCount(0)).toBe(`0 ${MasterPromptFieldCopy.Chars}`)
    expect(formatMasterPromptCharCount(132)).toBe(`132 ${MasterPromptFieldCopy.Chars}`)
  })
})
