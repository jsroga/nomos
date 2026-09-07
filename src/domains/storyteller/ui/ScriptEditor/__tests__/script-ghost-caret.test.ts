import { describe, expect, it } from 'vitest'
import { scriptGhostContinuation, scriptGhostOverlapsManuscript } from '../script-ghost-caret'

describe('scriptGhostOverlapsManuscript', () => {
  it('treats leftover prose after the caret as an overlap', () => {
    expect(scriptGhostOverlapsManuscript(' followed the needle.')).toBe(true)
    expect(scriptGhostOverlapsManuscript('   \n')).toBe(false)
    expect(scriptGhostOverlapsManuscript('')).toBe(false)
  })
})

describe('scriptGhostContinuation', () => {
  it('keeps a true continuation unchanged', () => {
    expect(scriptGhostContinuation('Jacek waited.', ' The compass ticked.')).toBe(
      ' The compass ticked.',
    )
  })

  it('strips a model echo of the written prefix', () => {
    expect(
      scriptGhostContinuation(
        'Jacek waited.',
        'Jacek waited. The compass ticked.',
      ),
    ).toBe(' The compass ticked.')
  })
})
