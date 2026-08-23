// @vitest-environment jsdom

/**
 * Guards the assistant-ui render loop regression: `@assistant-ui/tap` 0.9.14
 * turned an uncached `getSnapshot` into a thrown "Maximum update depth
 * exceeded", which killed the composer subtree (no typing, no injected user
 * turn). The repo pins tap to 0.9.4 via the lockfile — these mounts fail if a
 * bump reintroduces the throw.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AssistantChat, type AssistantPendingPrompt } from '../AssistantChat'

const LOOP_ERROR = /Maximum update depth|getSnapshot should be cached/
const REGENERATE_PROMPT = 'Regenerate soundtracks'
const ASSISTANT_REPLY = 'hi there'
const PROJECT_ID = 'p1'

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function assistantSseResponse(): Response {
  const frames = [
    { type: 'start' },
    { type: 'start-step' },
    { type: 'text-start', id: 't1' },
    { type: 'text-delta', id: 't1', delta: ASSISTANT_REPLY },
    { type: 'text-end', id: 't1' },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
    .map(frame => `data: ${JSON.stringify(frame)}\n\n`)
    .join('')
  return new Response(`${frames}data: [DONE]\n\n`, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

const stubFetch: typeof fetch = async (_input, init) =>
  init?.body == null ? new Response('{}', { status: 200 }) : assistantSseResponse()

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: StubResizeObserver,
    fetch: vi.fn(stubFetch),
  })
  // jsdom has no layout, and the thread viewport auto-scrolls on every commit.
  Element.prototype.scrollTo = () => {}
})

interface MountResult {
  container: HTMLElement
  root: Root | undefined
  errors: string[]
}

async function mount(node: React.ReactElement): Promise<MountResult> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root: Root | undefined
  const errors: string[] = []
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args.map(arg => String(arg)).join(' '))
  }
  try {
    await act(async () => {
      root = createRoot(container)
      root.render(node)
    })
  } catch (err) {
    errors.push(String(err))
  } finally {
    console.error = originalConsoleError
  }
  return { container, root, errors }
}

function RegenerateHarness() {
  const [prompt, setPrompt] = useState<AssistantPendingPrompt | null>(null)
  return (
    <>
      <button
        type="button"
        data-testid="regen"
        onClick={() => setPrompt({ id: 1, text: REGENERATE_PROMPT })}
      >
        regen
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

describe('AssistantChat render loop', () => {
  it('mounts the writers-room shape without an update-depth loop', async () => {
    const { container, root, errors } = await mount(
      <AssistantChat agentId="storyteller" body={{ projectId: PROJECT_ID }} pendingPrompt={null} />,
    )

    expect(errors.join('\n')).not.toMatch(LOOP_ERROR)
    expect(container.querySelector('textarea')).toBeTruthy()

    await act(async () => root?.unmount())
  })

  it('renders the injected user turn when a pending prompt arrives', async () => {
    const { container, root, errors } = await mount(<RegenerateHarness />)

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="regen"]')?.click()
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(errors.join('\n')).not.toMatch(LOOP_ERROR)
    expect(container.textContent).toContain(REGENERATE_PROMPT)

    await act(async () => root?.unmount())
  })
})
