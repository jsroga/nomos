import { describe, expect, it } from 'vitest'
import {
  AssistantChatStreamStatus,
  isAssistantTurnBusy,
  shouldEmitCompletedToolCalls,
} from '../assistant-turn-phase'

describe('assistant turn phase', () => {
  it('treats submitted and streaming as busy', () => {
    expect(isAssistantTurnBusy(AssistantChatStreamStatus.Submitted)).toBe(true)
    expect(isAssistantTurnBusy(AssistantChatStreamStatus.Streaming)).toBe(true)
  })

  it('treats ready, error and unknown as not busy', () => {
    expect(isAssistantTurnBusy(AssistantChatStreamStatus.Ready)).toBe(false)
    expect(isAssistantTurnBusy(AssistantChatStreamStatus.Error)).toBe(false)
    expect(isAssistantTurnBusy(undefined)).toBe(false)
  })

  it('never surfaces a pending approval while the answer is still streaming', () => {
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Streaming)).toBe(false)
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Submitted)).toBe(false)
  })

  it('surfaces pending approvals once the turn has ended', () => {
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Ready)).toBe(true)
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Error)).toBe(true)
  })
})
