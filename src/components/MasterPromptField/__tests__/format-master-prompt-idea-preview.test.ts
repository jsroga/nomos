import { describe, expect, it } from 'vitest'
import { MASTER_PROMPT_IDEA_PREVIEW_MAX, MASTER_PROMPT_IDEA_PREVIEW_SUFFIX } from '../constants/master-prompt-field'
import { formatMasterPromptIdeaPreview } from '../format-master-prompt-idea-preview'

describe('formatMasterPromptIdeaPreview', () => {
  it('keeps short ideas intact', () => {
    expect(formatMasterPromptIdeaPreview('short')).toBe('short')
  })

  it('truncates long ideas', () => {
    const idea = 'x'.repeat(MASTER_PROMPT_IDEA_PREVIEW_MAX + 12)
    const preview = formatMasterPromptIdeaPreview(idea)
    expect(preview.endsWith(MASTER_PROMPT_IDEA_PREVIEW_SUFFIX)).toBe(true)
    expect(preview.length).toBe(MASTER_PROMPT_IDEA_PREVIEW_MAX + MASTER_PROMPT_IDEA_PREVIEW_SUFFIX.length)
  })
})
