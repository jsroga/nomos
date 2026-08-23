import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EMPTY_TURN_NOTICE, withStreamTiming } from '../assistant-stream-timing'

function streamOf(chunks: unknown[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out.push(value)
  }
  return out
}

describe('withStreamTiming', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('injects a notice before finish when a turn produces nothing renderable', async () => {
    const frames = await collect(
      withStreamTiming(
        streamOf([{ type: 'start-step' }, { type: 'finish-step' }, { type: 'finish' }]),
        Date.now()
      )
    )

    const types = frames.map(f => f.type)
    expect(types).toEqual([
      'start-step',
      'finish-step',
      'text-start',
      'text-delta',
      'text-end',
      'finish',
    ])
    expect(frames.find(f => f.type === 'text-delta')?.delta).toBe(EMPTY_TURN_NOTICE)
  })

  it('leaves a turn that streamed text untouched', async () => {
    const original = [
      { type: 'start-step' },
      { type: 'text-start', id: 't1' },
      { type: 'text-delta', id: 't1', delta: 'hello' },
      { type: 'text-end', id: 't1' },
      { type: 'finish-step' },
      { type: 'finish' },
    ]
    const frames = await collect(withStreamTiming(streamOf(original), Date.now()))
    expect(frames.map(f => f.type)).toEqual(original.map(f => f.type))
  })

  it('still notices a turn that only reasoned and never answered', async () => {
    const frames = await collect(
      withStreamTiming(
        streamOf([
          { type: 'start-step' },
          { type: 'reasoning-start', id: 'r1' },
          { type: 'reasoning-delta', id: 'r1', delta: 'weighing options' },
          { type: 'reasoning-end', id: 'r1' },
          { type: 'finish' },
        ]),
        Date.now()
      )
    )
    // Reasoning is visible on screen but is not an answer.
    expect(frames.find(f => f.type === 'text-delta')?.delta).toBe(EMPTY_TURN_NOTICE)
    expect(frames.at(-1)?.type).toBe('finish')
  })

  it('passes reasoning frames through untouched', async () => {
    const frames = await collect(
      withStreamTiming(
        streamOf([
          { type: 'start-step' },
          { type: 'reasoning-delta', id: 'r1', delta: 'weighing options' },
          { type: 'text-start', id: 't1' },
          { type: 'text-delta', id: 't1', delta: 'done' },
          { type: 'finish' },
        ]),
        Date.now()
      )
    )
    expect(frames.some(f => f.type === 'reasoning-delta')).toBe(true)
    expect(frames.some(f => f.delta === EMPTY_TURN_NOTICE)).toBe(false)
  })

  it('treats a tool-only turn as renderable', async () => {
    const frames = await collect(
      withStreamTiming(
        streamOf([
          { type: 'start-step' },
          { type: 'tool-input-available' },
          { type: 'tool-output-available' },
          { type: 'finish' },
        ]),
        Date.now()
      )
    )
    expect(frames.some(f => f.type === 'text-delta')).toBe(false)
    expect(frames.at(-1)?.type).toBe('finish')
  })
})
