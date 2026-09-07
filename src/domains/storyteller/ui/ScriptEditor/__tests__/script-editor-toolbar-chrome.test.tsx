// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import {
  ScriptEditorChromeClass,
  ScriptEditorManuscriptToolbar,
  ScriptEditorToolbarClass,
  ScriptEditorToolbarCopy,
} from '../ScriptEditorManuscriptToolbar'
import { ScriptEditorSelectionMenu } from '../ScriptEditorSelectionMenu'
import { ScriptEditorSelectionMenuClass } from '../constants/script-editor'

const EDITOR_SRC = 'src/domains/storyteller/ui/ScriptEditor/ScriptEditor.tsx'

describe('ScriptEditor manuscript chrome contract', () => {
  it('places the Novel/Script bar after the writing surface, not as a tall top strip', () => {
    const src = readFileSync(EDITOR_SRC, 'utf8')
    const writing = src.indexOf('ScriptEditorSurfaceClass.Frame')
    const bar = src.indexOf('ScriptEditorChromeClass.Bar')
    expect(writing).toBeGreaterThan(-1)
    expect(bar).toBeGreaterThan(writing)
    expect(src).not.toMatch(/min-h-12 border-b/)
    expect(ScriptEditorChromeClass.Bar).toContain('h-9')
    expect(ScriptEditorChromeClass.Bar).toContain('pt-1')
    expect(ScriptEditorChromeClass.Bar).toContain('border-t')
    expect(ScriptEditorChromeClass.Bar).toContain('items-center')
  })
})

describe('ScriptEditorManuscriptToolbar', () => {
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

  it('keeps mode and action buttons on one compact aligned row', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <div className={ScriptEditorChromeClass.Bar}>
          <ScriptEditorManuscriptToolbar mode={ManuscriptMode.Novel} generateDisabled={false} />
        </div>
      )
    })
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons.map(button => button.textContent)).toEqual([
      ScriptEditorToolbarCopy.Script,
      ScriptEditorToolbarCopy.Novel,
      ScriptEditorToolbarCopy.GenerateNext,
      ScriptEditorToolbarCopy.RegenerateSection,
      ScriptEditorToolbarCopy.Compile,
    ])
    const compactHeight = ScriptEditorToolbarClass.Button.split(' ')[0]
    for (const button of buttons) {
      expect(button.className.split(/\s+/)).toContain(compactHeight)
    }
    expect(host.querySelector('[role="group"]')?.className).toContain('items-center')
  })
})

describe('ScriptEditorSelectionMenu stacking', () => {
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

  it('portals above the episode header stacking context', () => {
    const src = readFileSync(
      'src/domains/storyteller/ui/ScriptEditor/ScriptEditorSelectionMenu.tsx',
      'utf8',
    )
    expect(src).toContain('createPortal')
    expect(src).toContain('document.body')
    expect(ScriptEditorSelectionMenuClass.Menu).toContain('z-[200]')
    expect(ScriptEditorSelectionMenuClass.Backdrop).toContain('z-[199]')
  })

  it('mounts the Expand menu on document.body', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <ScriptEditorSelectionMenu
          visible
          selectionText="the needle"
          menuPosition={{ x: 120, y: 80 }}
          instruction=""
          isRegenerating={false}
          onInstructionChange={() => undefined}
          onRegenerate={() => undefined}
          onDismiss={() => undefined}
        />,
      )
    })
    const menus = [...document.body.querySelectorAll('button')].filter(
      button => button.textContent === 'Expand',
    )
    expect(menus).toHaveLength(1)
    expect(host.contains(menus[0] ?? null)).toBe(false)
  })
})
