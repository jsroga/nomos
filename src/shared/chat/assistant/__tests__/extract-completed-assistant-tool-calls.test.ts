import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { extractCompletedAssistantToolCalls } from '../extract-completed-assistant-tool-calls'

describe('extractCompletedAssistantToolCalls', () => {
  it('collects completed tools from every assistant message in the latest turn', () => {
    const messages: UIMessage[] = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Generate factions' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-update_world_bible',
            toolCallId: 't1',
            state: 'output-available',
            input: { factions: [{ name: 'Wardens', description: 'Keep the ledger.' }] },
            output: { success: true },
          },
        ],
      },
      {
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Done.' }],
      },
    ]

    const calls = extractCompletedAssistantToolCalls(messages)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.toolName).toBe('update_world_bible')
  })
})
