import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'
import { addToWorldButtonVisible } from '../add-to-world-visibility'

const THREAD_MESSAGES = 'src/shared/chat/assistant/AssistantThreadMessages.tsx'

describe('addToWorldButtonVisible', () => {
  it('hides when the host only passed onAddToWorld and when canAddToWorld is false', () => {
    expect(
      addToWorldButtonVisible({
        role: ChatMessageRole.Assistant,
        toolNames: [],
        toolArgs: [],
      }),
    ).toBe(false)
    expect(
      addToWorldButtonVisible({
        role: ChatMessageRole.Assistant,
        canAddToWorld: () => false,
        toolNames: ['run_beat_draft_workflow'],
        toolArgs: [{ brief: 'Draft the next beat.' }],
      }),
    ).toBe(false)
  })

  it('shows only when the host predicate returns true', () => {
    expect(
      addToWorldButtonVisible({
        role: ChatMessageRole.Assistant,
        canAddToWorld: () => true,
        toolNames: ['update_world_bible'],
        toolArgs: [{ factions: [] }],
      }),
    ).toBe(true)
  })

  it('does not treat onAddToWorld as enough to show the button', () => {
    const src = readFileSync(THREAD_MESSAGES, 'utf8')
    expect(src).toContain('addToWorldButtonVisible')
    expect(src).not.toContain('Boolean(onAddToWorld)')
  })
})
