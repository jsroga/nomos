import { describe, expect, it } from 'vitest'
import { masterPromptAfterModePick } from '../useWorldSidebarPrompt'

describe('masterPromptAfterModePick', () => {
  it('uses the mode hint when the textarea is empty', () => {
    expect(masterPromptAfterModePick('', 'hint sentence')).toBe('hint sentence')
    expect(masterPromptAfterModePick('   ', 'hint sentence')).toBe('hint sentence')
  })

  it('leaves existing master prompt text unchanged', () => {
    expect(masterPromptAfterModePick('a rainy port', 'hint sentence')).toBe('a rainy port')
  })
})
