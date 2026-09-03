import { it } from 'vitest'

/**
 * Probe for `dangerouslyIgnoreUnhandledErrors`. Must not be in the default
 * Vitest include — the parent gate spawns this file on its own.
 */
it('leaks', () => {
  void Promise.reject(new Error('probe'))
})
