// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SCRIPT_EDITOR_SCRIPT_TYPE, ScriptEditorSurfaceClass } from '../constants/script-editor'
import { ScriptEditorGhostOverlay, ScriptGhostShadowClass } from '../ScriptEditorGhostOverlay'

const EDITOR_SRC = 'src/domains/storyteller/ui/ScriptEditor/ScriptEditor.tsx'
const PREFIX = 'INT. WORKSHOP\nSera sets the compass down.'
const GHOST = ' The needle stays dark.'

describe('ScriptEditor ghost overlay contract', () => {
  it('wires caret-prefix shadow text into the writing frame, not a bottom pin', () => {
    const src = readFileSync(EDITOR_SRC, 'utf8')
    expect(src).toContain('ghostPrefix')
    expect(src).toContain('prefix={ghostPrefix}')
    expect(src).toContain('getCaret')
    expect(src).toContain('manuscriptCaretSlice')
    expect(src.indexOf('<ScriptEditorGhostOverlay')).toBeGreaterThan(
      src.indexOf('ScriptEditorSurfaceClass.Frame')
    )
    expect(src).not.toContain('bottom-6')
    expect(ScriptGhostShadowClass.Layer.includes('bottom-')).toBe(false)
    expect(ScriptGhostShadowClass.Layer).toContain('inset-0')
    expect(ScriptGhostShadowClass.Layer).toContain('px-16')
    expect(ScriptEditorSurfaceClass.Editor).toContain('px-16')
  })
})

describe('ScriptEditorGhostOverlay', () => {
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
  })

  it('renders shadow text immediately after the prefix at the caret', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <ScriptEditorGhostOverlay ghost={GHOST} prefix={PREFIX} style={SCRIPT_EDITOR_SCRIPT_TYPE} />
      )
    })
    const layer = host.querySelector('[aria-hidden]')
    expect(layer).not.toBeNull()
    expect(layer?.className).toContain('inset-0')
    expect(layer?.className).toContain('px-16')
    expect(layer?.textContent).toBe(`${PREFIX}${GHOST}`)
    const spans = [...host.querySelectorAll('span')]
    expect(spans).toHaveLength(2)
    expect(spans[0]?.className).toContain(ScriptGhostShadowClass.Prefix)
    expect(spans[0]?.textContent).toBe(PREFIX)
    expect(spans[1]?.className).toContain(ScriptGhostShadowClass.Ghost)
    expect(spans[1]?.textContent).toBe(GHOST)
  })

  it('renders nothing when there is no ghost', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <ScriptEditorGhostOverlay ghost="" prefix={PREFIX} style={SCRIPT_EDITOR_SCRIPT_TYPE} />
      )
    })
    expect(host.querySelector('[aria-hidden]')).toBeNull()
    expect(host.textContent).toBe('')
  })
})
