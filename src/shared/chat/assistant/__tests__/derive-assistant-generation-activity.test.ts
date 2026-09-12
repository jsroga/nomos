import { describe, expect, it } from 'vitest'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  deriveAssistantGenerationActivity,
} from '../derive-assistant-generation-activity'
import type { UIMessage } from 'ai'
import { AssistantReasoningPrefix, ChatPartType } from '@/shared/chat/core/utils/assistant-thread-ui'
import { AppModuleId } from '@/shared/data/constants/protocol'

enum LoopCrewActivityFixture {
  MechanicsDesigner = 'Mechanics Designer is designing core loops and mechanics…',
  WritersRoom = 'Writers Room',
}

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

  it('labels an empty running turn as waiting for the first token', () => {
    const messages: UIMessage[] = [{ id: 'a1', role: 'assistant', parts: [] }]
    const activity = deriveAssistantGenerationActivity(messages)
    expect(activity?.phase).toBe(AssistantGenerationPhase.Submitted)
    expect(activity?.label).toBe(AssistantGenerationLabel.WaitingFirstToken)
  })

  it('surfaces streamed reasoning as thinking with a preview', () => {
    const messages: UIMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: ChatPartType.Reasoning,
            text: 'The next beat is the revelation scene itself.',
          },
        ],
      },
    ]
    const activity = deriveAssistantGenerationActivity(messages)
    expect(activity?.phase).toBe(AssistantGenerationPhase.Streaming)
    expect(activity?.label).toBe(AssistantGenerationLabel.Thinking)
    expect(activity?.preview).toContain('revelation scene')
  })

  it('keeps Storyteller waiting copy on an empty running turn', () => {
    const messages: UIMessage[] = [{ id: 'a1', role: 'assistant', parts: [] }]
    const activity = deriveAssistantGenerationActivity(messages)
    expect(activity?.label).toBe(AssistantGenerationLabel.WaitingFirstToken)
    expect(activity?.label).not.toBe(AssistantGenerationLabel.LoopWaiting)
  })

  it('uses Loop Creator crew copy instead of Writers Room', () => {
    const messages: UIMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: ChatPartType.Reasoning,
            text: `${AssistantReasoningPrefix.Activity}${LoopCrewActivityFixture.MechanicsDesigner}`,
          },
        ],
      },
    ]
    const activity = deriveAssistantGenerationActivity(
      messages,
      undefined,
      AppModuleId.LoopCreator,
    )
    expect(activity?.label).toBe(LoopCrewActivityFixture.MechanicsDesigner)
    expect(activity?.label).not.toContain(LoopCrewActivityFixture.WritersRoom)
  })

  it('labels an empty Loop Creator turn as Showrunner routing', () => {
    const messages: UIMessage[] = [{ id: 'a1', role: 'assistant', parts: [] }]
    const activity = deriveAssistantGenerationActivity(
      messages,
      undefined,
      AppModuleId.LoopCreator,
    )
    expect(activity?.label).toBe(AssistantGenerationLabel.LoopWaiting)
    expect(activity?.label).not.toContain(LoopCrewActivityFixture.WritersRoom)
  })
})
