// @vitest-environment jsdom

/**
 * Confirms the user actually SEES something when the model returns nothing.
 *
 * Wires the real pieces together: an empty agent stream (`start-step`,
 * `finish-step`, `finish` — the reported `count=3` turn) is piped through the
 * route's real `withStreamTiming`, serialized to SSE exactly as the route
 * responds, and fed to the real `AssistantChat`. The assertion is on rendered
 * DOM text, so it fails if the notice is dropped anywhere between the transform
 * and the thread.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EMPTY_TURN_NOTICE, withStreamTiming } from '../assistant-stream-timing'
import { AssistantChat, type AssistantPendingPrompt } from '../AssistantChat'

const PROMPT = 'Regenerate the soundtracks'
const REASONING_TEXT = 'Weighing which tracks fit the Stillness'
const PROJECT_ID = 'p1'

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** A turn that streams its thinking before answering. */
const REASONING_FRAMES = [
  { type: 'start-step' },
  { type: 'reasoning-start', id: 'r1' },
  { type: 'reasoning-delta', id: 'r1', delta: REASONING_TEXT },
  { type: 'reasoning-end', id: 'r1' },
  { type: 'text-start', id: 't1' },
  { type: 'text-delta', id: 't1', delta: 'Here are three tracks.' },
  { type: 'text-end', id: 't1' },
  { type: 'finish-step' },
  { type: 'finish' },
]

/** The frames a turn emits when the model answers with nothing at all. */
const EMPTY_AGENT_FRAMES = [
  { type: 'start-step' },
  { type: 'finish-step' },
  { type: 'finish' },
]

function streamOf(chunks: unknown[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

/** Serializes the transform's output the way the route's SSE response does. */
async function sseFor(frames: unknown[]): Promise<string> {
  const stream = withStreamTiming(streamOf(frames), Date.now())
  const reader = stream.getReader()
  // The route writes its own `start` frame before merging the agent stream.
  let body = `data: ${JSON.stringify({ type: 'start', messageId: 'm1' })}\n\n`
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    body += `data: ${JSON.stringify(value)}\n\n`
  }
  return `${body}data: [DONE]\n\n`
}

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: StubResizeObserver,
  })
  Element.prototype.scrollTo = () => {}
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function Harness() {
  const [prompt, setPrompt] = useState<AssistantPendingPrompt | null>(null)
  return (
    <>
      <button type="button" data-testid="send" onClick={() => setPrompt({ id: 1, text: PROMPT })}>
        send
      </button>
      <AssistantChat
        agentId="storyteller"
        body={{ projectId: PROJECT_ID }}
        pendingPrompt={prompt}
        onPendingPromptHandled={() => setPrompt(null)}
      />
    </>
  )
}

async function renderTurn(sse: string): Promise<{ text: string; unmount: () => void }> {
  const stubFetch: typeof fetch = async (_input, init) =>
    init?.body == null
      ? new Response('{}', { status: 200 })
      : new Response(sse, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        })
  Object.assign(globalThis, { fetch: vi.fn(stubFetch) })

  const container = document.createElement('div')
  document.body.appendChild(container)
  let root: Root | undefined

  await act(async () => {
    root = createRoot(container)
    root.render(<Harness />)
  })
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="send"]')?.click()
  })
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
  })

  return {
    text: container.textContent ?? '',
    unmount: () => root?.unmount(),
  }
}

describe('empty turn notice', () => {
  it('renders the notice in the thread when the model returns nothing', async () => {
    const sse = await sseFor(EMPTY_AGENT_FRAMES)
    // Sanity: the transform must have injected the notice into the wire bytes.
    expect(sse).toContain(EMPTY_TURN_NOTICE)

    const { text, unmount } = await renderTurn(sse)
    expect(text).toContain(PROMPT)
    expect(text).toContain(EMPTY_TURN_NOTICE)

    await act(async () => unmount())
  })
})

describe('streamed reasoning', () => {
  it('shows the model thinking in the thread', async () => {
    const { text, unmount } = await renderTurn(await sseFor(REASONING_FRAMES))

    // The whole point: the thinking is visible, not swallowed.
    expect(text).toContain(REASONING_TEXT)
    expect(text).toContain('Here are three tracks.')
    expect(text).not.toContain(EMPTY_TURN_NOTICE)

    await act(async () => unmount())
  })
})
