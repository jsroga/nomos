// @vitest-environment jsdom

/**
 * The Send button must enable once the composer holds text. It read `canSend`
 * off a different store than the one this composer writes, so it stayed
 * disabled forever and only Enter could send.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AssistantChat } from '../AssistantChat'

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: StubResizeObserver,
    fetch: vi.fn(async () => new Response('{}', { status: 200 })),
  })
  Element.prototype.scrollTo = () => {}
})

/** Sets the value the way a real keystroke does, so React's onChange fires. */
function typeInto(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set
  setter?.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('composer send button', () => {
  it('enables once the composer has text', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    let root: Root | undefined

    await act(async () => {
      root = createRoot(container)
      root.render(<AssistantChat agentId="storyteller" body={{ projectId: 'p1' }} />)
    })

    const textarea = container.querySelector('textarea')
    expect(textarea).toBeTruthy()

    const sendBefore = container.querySelector<HTMLButtonElement>('button[aria-label="Send"]')
    expect(sendBefore?.disabled).toBe(true)

    await act(async () => {
      if (textarea) typeInto(textarea, 'Hello')
    })

    expect(textarea?.value).toBe('Hello')
    const sendAfter = container.querySelector<HTMLButtonElement>('button[aria-label="Send"]')
    expect(sendAfter?.disabled).toBe(false)

    await act(async () => root?.unmount())
  })
})
