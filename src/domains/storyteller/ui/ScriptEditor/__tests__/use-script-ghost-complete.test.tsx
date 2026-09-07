// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { ScriptGhostIdleMs, ScriptGhostKey } from '../script-ghost-keys'
import { useScriptGhostComplete } from '../useScriptGhostComplete'
import type { ManuscriptCaretSlice } from '../script-ghost-caret'

const PREFIX = 'INT. WORKSHOP\nSera waits.'
const GHOST = ' The alchemist does not look up.'
const EXISTING_SUFFIX = ' The cellar stays dark.'

const completeStorytellerScriptGhost = vi.hoisted(() => vi.fn())

vi.mock('@/domains/storyteller/core/io/script-ghost.api', () => ({
  completeStorytellerScriptGhost,
}))

function Probe({
  onAccept,
  onReady,
  suffix = '',
}: {
  onAccept: (ghost: string) => void
  onReady: (schedule: () => void) => void
  suffix?: string
}) {
  const ghost = useScriptGhostComplete({
    enabled: true,
    projectId: 'project-1',
    episodeId: 'episode-1',
    mode: ManuscriptMode.Novel,
    getCaret: (): ManuscriptCaretSlice => ({ prefix: PREFIX, suffix }),
    onAccept,
  })
  useEffect(() => {
    onReady(ghost.schedule)
  }, [ghost.schedule, onReady])
  return (
    <div
      tabIndex={0}
      data-ghost={ghost.ghost}
      data-prefix={ghost.ghostPrefix}
      onKeyDown={ghost.onKeyDown}
    >
      {ghost.ghost}
    </div>
  )
}

describe('useScriptGhostComplete', () => {
  let host: HTMLElement
  let root: Root | undefined

  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    host?.remove()
    vi.useRealTimers()
    completeStorytellerScriptGhost.mockReset()
  })

  it('stores the completion prefix so the overlay can sit at the caret', async () => {
    completeStorytellerScriptGhost.mockResolvedValue(GHOST)
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    let schedule: (() => void) | undefined
    const onAccept = vi.fn()
    await act(async () => {
      root?.render(
        <Probe
          onAccept={onAccept}
          onReady={next => {
            schedule = next
          }}
        />
      )
    })
    await act(async () => {
      schedule?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ScriptGhostIdleMs.Pause)
    })
    const node = host.querySelector('[data-ghost]')
    expect(node?.getAttribute('data-prefix')).toBe(PREFIX)
    expect(node?.getAttribute('data-ghost')).toBe(GHOST)
    expect(completeStorytellerScriptGhost).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: PREFIX, mode: ManuscriptMode.Novel })
    )
  })

  it('does not fetch a ghost when prose already follows the caret', async () => {
    completeStorytellerScriptGhost.mockResolvedValue(GHOST)
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    let schedule: (() => void) | undefined
    await act(async () => {
      root?.render(
        <Probe
          suffix={EXISTING_SUFFIX}
          onAccept={vi.fn()}
          onReady={next => {
            schedule = next
          }}
        />
      )
    })
    await act(async () => {
      schedule?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ScriptGhostIdleMs.Pause)
    })
    expect(completeStorytellerScriptGhost).not.toHaveBeenCalled()
    expect(host.querySelector('[data-ghost]')?.getAttribute('data-ghost')).toBe('')
  })

  it('ignores a stale completion after a newer request starts', async () => {
    let resolveStale: ((value: string) => void) | undefined
    completeStorytellerScriptGhost
      .mockImplementationOnce(
        () =>
          new Promise<string>(resolve => {
            resolveStale = resolve
          }),
      )
      .mockResolvedValueOnce(GHOST)
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    let schedule: (() => void) | undefined
    await act(async () => {
      root?.render(
        <Probe
          onAccept={vi.fn()}
          onReady={next => {
            schedule = next
          }}
        />
      )
    })
    await act(async () => {
      schedule?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ScriptGhostIdleMs.Pause)
    })
    await act(async () => {
      schedule?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ScriptGhostIdleMs.Pause)
    })
    await act(async () => {
      resolveStale?.(' STALE OVERLAP')
    })
    expect(host.querySelector('[data-ghost]')?.getAttribute('data-ghost')).toBe(GHOST)
  })

  it('accepts the ghost on Tab', async () => {
    completeStorytellerScriptGhost.mockResolvedValue(GHOST)
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    let schedule: (() => void) | undefined
    const onAccept = vi.fn()
    await act(async () => {
      root?.render(
        <Probe
          onAccept={onAccept}
          onReady={next => {
            schedule = next
          }}
        />
      )
    })
    await act(async () => {
      schedule?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ScriptGhostIdleMs.Pause)
    })
    const node = host.querySelector('[data-ghost]')
    expect(node).not.toBeNull()
    await act(async () => {
      node?.dispatchEvent(
        new KeyboardEvent('keydown', { key: ScriptGhostKey.Tab, bubbles: true, cancelable: true })
      )
    })
    expect(onAccept).toHaveBeenCalledWith(GHOST)
    expect(host.querySelector('[data-ghost]')?.getAttribute('data-ghost')).toBe('')
  })
})
