import { describe, expect, it } from 'vitest'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  deriveAssistantGenerationActivity,
} from '../derive-assistant-generation-activity'
import type { UIMessage } from 'ai'

describe('deriveAssistantGenerationActivity', () => {
  it('marks a completed tool as loaded so overlays can drop the spinner', () => {
    const messages: UIMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-update_world_bible',
            toolCallId: 't1',
            state: 'output-available',
            input: { worldDescription: '**The Ward** keeps the ledger.' },
            output: { success: true },
          },
        ],
      },
    ]

    const activity = deriveAssistantGenerationActivity(messages)
    expect(activity?.toolComplete).toBe(true)
    expect(activity?.phase).toBe(AssistantGenerationPhase.Tool)
    expect(activity?.preview).toBe('**The Ward** keeps the ledger.')
    expect(activity?.label).toContain(AssistantGenerationLabel.ToolDoneSuffix)
  })
})
