import { describe, expect, it } from 'vitest'
import { manuscriptGenerateDisabled } from '../manuscript-generate-disabled'

describe('manuscriptGenerateDisabled', () => {
  it('disables generate when there are no beats', () => {
    expect(manuscriptGenerateDisabled(0)).toBe(true)
  })

  it('allows generate when the board has at least one beat', () => {
    expect(manuscriptGenerateDisabled(1)).toBe(false)
  })
})
