import { describe, expect, it } from 'vitest'
import { isIgnorableGameEntityFetchError } from '@/shared/chat/core/constants/game-entity-mentions'
import { DomAbortErrorName } from '@/shared/data/constants/game-entities-wire'

describe('isIgnorableGameEntityFetchError', () => {
  it('ignores aborted requests and browser network TypeErrors', () => {
    const aborted = new Error('aborted')
    aborted.name = DomAbortErrorName.AbortError
    expect(isIgnorableGameEntityFetchError(aborted)).toBe(true)
    expect(isIgnorableGameEntityFetchError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('still reports HTTP and parse failures', () => {
    expect(isIgnorableGameEntityFetchError(new Error('Failed to fetch entities'))).toBe(false)
  })
})
