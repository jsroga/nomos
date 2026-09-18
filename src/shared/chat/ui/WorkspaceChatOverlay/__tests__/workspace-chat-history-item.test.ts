// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { WorkspaceChatHistoryActionClass } from '../workspace-chat-copy'
import { shouldFocusHistorySessionOnSelect } from '../workspace-chat-session-helpers'

const ITEM_SRC = 'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatHistoryItem.tsx'

describe('shouldFocusHistorySessionOnSelect', () => {
  it('focuses the row except when renaming or clicking an action control', () => {
    expect(shouldFocusHistorySessionOnSelect(false, null)).toBe(true)
    expect(shouldFocusHistorySessionOnSelect(true, null)).toBe(false)
    const action = document.createElement('button')
    action.className = WorkspaceChatHistoryActionClass.Root
    document.body.appendChild(action)
    expect(shouldFocusHistorySessionOnSelect(false, action)).toBe(false)
    action.remove()
  })
})

describe('WorkspaceChatHistoryItem', () => {
  it('focuses the session from the menu item onSelect, not only the nested title button', () => {
    const src = readFileSync(ITEM_SRC, 'utf8')
    expect(src).toContain('shouldFocusHistorySessionOnSelect')
    expect(src).toContain('onFocusSession()')
    expect(src).not.toMatch(/onSelect=\{event => event.preventDefault\(\)\}/)
  })
})
