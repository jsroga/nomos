import { describe, it, expect } from 'vitest'
import type { AgentControllerEvent, AgentControllerMessage } from '@mastra/core/agent-controller'
import {
  createControllerStreamContext,
  mapControllerEvent,
} from '../controller-sse-wire'

function assistantMessage(id: string, text: string, thinking = ''): AgentControllerMessage {
  const content: AgentControllerMessage['content'] = []
  if (thinking) content.push({ type: 'thinking', thinking })
  if (text) content.push({ type: 'text', text })
  return { id, role: 'assistant', content, createdAt: new Date() }
}

describe('mapControllerEvent — SSE frame intents', () => {
  it('emits only the newly-appended token delta across cumulative snapshots', () => {
    const ctx = createControllerStreamContext()
    const first: AgentControllerEvent = { type: 'message_update', message: assistantMessage('m1', 'Hello') }
    const second: AgentControllerEvent = {
      type: 'message_update',
      message: assistantMessage('m1', 'Hello world'),
    }

    expect(mapControllerEvent(first, ctx)).toEqual([{ kind: 'token', token: 'Hello' }])
    // Second snapshot is cumulative → only the delta ' world' is emitted.
    expect(mapControllerEvent(second, ctx)).toEqual([{ kind: 'token', token: ' world' }])
    // No growth → no frame.
    expect(mapControllerEvent(second, ctx)).toEqual([])
  })

  it('separates reasoning (thinking) deltas from text deltas', () => {
    const ctx = createControllerStreamContext()
    const evt: AgentControllerEvent = {
      type: 'message_update',
      message: assistantMessage('m2', 'Answer', 'reasoning'),
    }
    expect(mapControllerEvent(evt, ctx)).toEqual([
      { kind: 'thinking', thinking: 'reasoning' },
      { kind: 'token', token: 'Answer' },
    ])
  })

  it('maps tool lifecycle: start → status, end → toolResult carrying the captured name', () => {
    const ctx = createControllerStreamContext()
    const start: AgentControllerEvent = {
      type: 'tool_start',
      toolCallId: 't1',
      toolName: 'read_world_bible',
      args: {},
    }
    const end: AgentControllerEvent = {
      type: 'tool_end',
      toolCallId: 't1',
      result: { ok: true },
      isError: false,
    }
    expect(mapControllerEvent(start, ctx)).toEqual([{ kind: 'status' }])
    expect(mapControllerEvent(end, ctx)).toEqual([
      { kind: 'toolResult', toolName: 'read_world_bible', result: { ok: true }, isError: false },
    ])
  })

  it('surfaces submit_plan approval as a plan question (the plan-first gate)', () => {
    const ctx = createControllerStreamContext()
    const evt: AgentControllerEvent = {
      type: 'tool_approval_required',
      toolCallId: 'p1',
      toolName: 'submit_plan',
      args: { plan: 'Update the world bible' },
    }
    expect(mapControllerEvent(evt, ctx)).toEqual([
      { kind: 'planQuestion', toolCallId: 'p1', toolName: 'submit_plan', args: { plan: 'Update the world bible' } },
    ])
  })

  it('maps mode_changed → info and a clean agent_end → complete', () => {
    const ctx = createControllerStreamContext()
    expect(mapControllerEvent({ type: 'mode_changed', modeId: 'build', previousModeId: 'chat' }, ctx)).toEqual([
      { kind: 'info', message: 'Mode: build' },
    ])
    expect(mapControllerEvent({ type: 'agent_end', reason: 'complete' }, ctx)).toEqual([{ kind: 'complete' }])
  })

  it('does not complete on a failed run (error already surfaced separately)', () => {
    const ctx = createControllerStreamContext()
    expect(mapControllerEvent({ type: 'agent_end', reason: 'error' }, ctx)).toEqual([])
  })

  it('maps error events and ignores agent_start (Start is emitted at stream open)', () => {
    const ctx = createControllerStreamContext()
    const err = new Error('boom')
    expect(mapControllerEvent({ type: 'error', error: err }, ctx)).toEqual([{ kind: 'error', error: err }])
    expect(mapControllerEvent({ type: 'agent_start' }, ctx)).toEqual([])
  })
})
