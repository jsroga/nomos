import { describe, expect, it, vi } from 'vitest'
import {
  TriggerRunPollAbortedError,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
import { logPollErrorUnlessAborted } from '../log-poll-error-unless-aborted'

describe('logPollErrorUnlessAborted', () => {
  it('does not log abort as an error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logPollErrorUnlessAborted('Error polling task status:', new TriggerRunPollAbortedError())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not log Trigger run failures as console errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logPollErrorUnlessAborted(
      'Error polling task status:',
      new TriggerRunPollFailedError('CANCELED', undefined),
    )
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('logs unexpected poll failures', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('boom')
    logPollErrorUnlessAborted('Error polling task status:', error)
    expect(spy).toHaveBeenCalledWith('Error polling task status:', error)
    spy.mockRestore()
  })
})
