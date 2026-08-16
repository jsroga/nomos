import { describe, expect, it } from 'vitest'
import { ReactConsoleNoise } from '../constants/error-boundary'
import { shouldCaptureConsoleError } from '../should-capture-console-error'

describe('shouldCaptureConsoleError', () => {
  it('skips React getSnapshot loops so TroubleshootPanel does not setState during render', () => {
    expect(
      shouldCaptureConsoleError(
        `The result of ${ReactConsoleNoise.GetSnapshotCached} to avoid an infinite loop`,
      ),
    ).toBe(false)
  })

  it('skips setState-during-render and max-update-depth warnings', () => {
    expect(
      shouldCaptureConsoleError(
        `${ReactConsoleNoise.CannotUpdateWhileRendering} (\`TroubleshootPanel\`) while rendering a different component (\`AddToWorldButton\`)`,
      ),
    ).toBe(false)
    expect(shouldCaptureConsoleError(ReactConsoleNoise.MaxUpdateDepth)).toBe(false)
  })

  it('captures real console errors', () => {
    expect(shouldCaptureConsoleError('Failed to save bible')).toBe(true)
    expect(
      shouldCaptureConsoleError(
        'Error fetching workspace projects: Request failed with status 500',
      ),
    ).toBe(true)
  })
})
