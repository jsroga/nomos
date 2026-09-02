import { describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import { AssistantChatStreamStatus } from '../assistant-turn-phase'
import { AssistantGenerationLabel } from '../derive-assistant-generation-activity'
import { syncBusyTurnActivityFromMessages } from '../use-assistant-turn-settle'

describe('syncBusyTurnActivityFromMessages', () => {
  it('does not re-emit when only tool input preview grows during streaming', () => {
    const onGenerationActivity = vi.fn()
    const onGenerationActivityRef = { current: onGenerationActivity }
    const lastFingerprint = { current: '' }

    const streamingMessage: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-update_world_bible',
          toolCallId: 't1',
          state: 'input-streaming',
          input: { worldDescription: 'Salt marsh.' },
        },
      ],
    }

    syncBusyTurnActivityFromMessages(
      AssistantChatStreamStatus.Streaming,
      [streamingMessage],
      'storyteller',
      lastFingerprint,
      onGenerationActivityRef,
    )
    expect(onGenerationActivity).toHaveBeenCalledTimes(1)

    const longerPreview: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-update_world_bible',
          toolCallId: 't1',
          state: 'input-streaming',
          input: { worldDescription: 'Salt marsh city lit by bioluminescent kelp.' },
        },
      ],
    }

    syncBusyTurnActivityFromMessages(
      AssistantChatStreamStatus.Streaming,
      [longerPreview],
      'storyteller',
      lastFingerprint,
      onGenerationActivityRef,
    )
    expect(onGenerationActivity).toHaveBeenCalledTimes(1)
  })

  it('re-emits when tool phase changes from streaming input to done', () => {
    const onGenerationActivity = vi.fn()
    const onGenerationActivityRef = { current: onGenerationActivity }
    const lastFingerprint = { current: '' }

    syncBusyTurnActivityFromMessages(
      AssistantChatStreamStatus.Streaming,
      [
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-update_world_bible',
              toolCallId: 't1',
              state: 'input-streaming',
              input: { soundtracks: [] },
            },
          ],
        },
      ],
      'storyteller',
      lastFingerprint,
      onGenerationActivityRef,
    )
    expect(onGenerationActivity).toHaveBeenCalledTimes(1)
    expect(onGenerationActivity.mock.calls[0]?.[0]?.label).toContain(
      AssistantGenerationLabel.ToolStreamingSuffix,
    )

    syncBusyTurnActivityFromMessages(
      AssistantChatStreamStatus.Streaming,
      [
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-update_world_bible',
              toolCallId: 't1',
              state: 'output-available',
              input: { soundtracks: [{ title: 'A', artist: 'B', youtubeUrl: 'https://youtu.be/x' }] },
              output: { success: true },
            },
          ],
        },
      ],
      'storyteller',
      lastFingerprint,
      onGenerationActivityRef,
    )
    expect(onGenerationActivity).toHaveBeenCalledTimes(2)
    expect(onGenerationActivity.mock.calls[1]?.[0]?.label).toContain(
      AssistantGenerationLabel.ToolDoneSuffix,
    )
  })

  it('no-ops when the turn is not busy', () => {
    const onGenerationActivity = vi.fn()
    const onGenerationActivityRef = { current: onGenerationActivity }
    const lastFingerprint = { current: '' }

    syncBusyTurnActivityFromMessages(
      AssistantChatStreamStatus.Ready,
      [],
      'storyteller',
      lastFingerprint,
      onGenerationActivityRef,
    )
    expect(onGenerationActivity).not.toHaveBeenCalled()
  })
})
