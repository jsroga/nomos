import { beforeEach, describe, expect, it } from 'vitest'
import { useErrorStore } from '../useErrorStore'

describe('useErrorStore', () => {
  beforeEach(() => {
    useErrorStore.setState({
      errors: [],
      isPanelOpen: false,
      hasUnviewedErrors: false,
    })
  })

  it('opens the troubleshoot panel when an error is captured', () => {
    useErrorStore.getState().addError({
      message: 'Error fetching workspace projects: Request failed with status 500',
    })

    const state = useErrorStore.getState()
    expect(state.isPanelOpen).toBe(true)
    expect(state.hasUnviewedErrors).toBe(true)
    expect(state.errors[0]?.message).toContain('Request failed with status 500')
  })
})
