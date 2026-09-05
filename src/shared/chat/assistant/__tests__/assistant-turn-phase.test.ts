import { describe, expect, it } from 'vitest'
import {
  AssistantChatStreamStatus,
  ASSISTANT_TURN_SETTLE_MS,
  isAssistantTurnBusy,
  isAssistantTurnFailed,
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

  it('treats status=error or an error object as a failed turn', () => {
    expect(isAssistantTurnFailed(AssistantChatStreamStatus.Error, undefined)).toBe(true)
    expect(isAssistantTurnFailed(AssistantChatStreamStatus.Streaming, new Error('boom'))).toBe(true)
    expect(isAssistantTurnFailed(AssistantChatStreamStatus.Streaming, undefined)).toBe(false)
    expect(isAssistantTurnFailed(AssistantChatStreamStatus.Ready, null)).toBe(false)
  })

  it('never surfaces a pending approval while the answer is still streaming', () => {
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Streaming)).toBe(false)
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Submitted)).toBe(false)
  })

  it('surfaces pending approvals once the turn has ended', () => {
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Ready)).toBe(true)
    expect(shouldEmitCompletedToolCalls(AssistantChatStreamStatus.Error)).toBe(true)
  })

  it('exposes a settle delay for ready blips between tool rounds', () => {
    expect(ASSISTANT_TURN_SETTLE_MS).toBeGreaterThan(0)
  })
})
