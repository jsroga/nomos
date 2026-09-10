import { describe, expect, it } from 'vitest'
import { ChatMessageRole } from '../../core/utils/assistant-thread-ui'
import { createThreadNeedsRunningPlaceholderSelector } from '../assistant-thread-selectors'

describe('createThreadNeedsRunningPlaceholderSelector', () => {
  it('shows wait dots when the last row is still the user turn', () => {
    const select = createThreadNeedsRunningPlaceholderSelector()
    expect(
      select({
        isRunning: true,
        messages: [
          { role: ChatMessageRole.User, content: [{ type: 'text', text: 'Draft the next beat.' }] },
        ],
      }),
    ).toBe(true)
    expect(
      select({
        isRunning: true,
        messages: [
          { role: ChatMessageRole.User, content: [{ type: 'text', text: 'Draft the next beat.' }] },
          { role: ChatMessageRole.Assistant, content: [] },
        ],
      }),
    ).toBe(false)
  })
})
