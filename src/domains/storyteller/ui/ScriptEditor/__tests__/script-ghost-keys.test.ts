import { describe, expect, it } from 'vitest'
import {
  ScriptGhostKey,
  ScriptGhostKeyAction,
  scriptGhostKeyAction,
} from '../script-ghost-keys'

describe('scriptGhostKeyAction', () => {
  it('accepts Tab and dismisses Escape when a ghost is showing', () => {
    expect(scriptGhostKeyAction(ScriptGhostKey.Tab, true)).toBe(ScriptGhostKeyAction.Accept)
    expect(scriptGhostKeyAction(ScriptGhostKey.Escape, true)).toBe(ScriptGhostKeyAction.Dismiss)
  })

  it('ignores keys when no ghost is showing', () => {
    expect(scriptGhostKeyAction(ScriptGhostKey.Tab, false)).toBe(ScriptGhostKeyAction.Ignore)
    expect(scriptGhostKeyAction(ScriptGhostKey.Escape, false)).toBe(ScriptGhostKeyAction.Ignore)
  })

  it('ignores other keys so typing can reject the ghost', () => {
    expect(scriptGhostKeyAction('a', true)).toBe(ScriptGhostKeyAction.Ignore)
  })
})
