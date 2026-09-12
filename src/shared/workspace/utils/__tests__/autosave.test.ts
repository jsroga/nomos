import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutosaveScope, AutosaveStatus, AUTOSAVE_SAVED_VISIBLE_MS } from '@/shared/workspace/constants/autosave'
import {
  selectAutosaveIndicatorStatus,
  useAutosaveStatusStore,
} from '@/shared/workspace/autosave-status-store'
import { autosaveKey, withAutosave } from '@/shared/workspace/utils/autosave'

describe('withAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAutosaveStatusStore.setState({ entries: {} })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    useAutosaveStatusStore.setState({ entries: {} })
  })

  it('marks the key saving then saved', async () => {
    const key = autosaveKey(AutosaveScope.Loop, 'loop-1')
    await withAutosave(key, async () => 'ok')
    expect(useAutosaveStatusStore.getState().entries[key]).toBe(AutosaveStatus.Saved)
    vi.advanceTimersByTime(AUTOSAVE_SAVED_VISIBLE_MS)
    expect(useAutosaveStatusStore.getState().entries[key]).toBeUndefined()
  })

  it('marks the key failed and rethrows', async () => {
    const key = autosaveKey(AutosaveScope.EpisodeScript, 'ep-1')
    await expect(
      withAutosave(key, async () => {
        throw new Error('nope')
      }),
    ).rejects.toThrow('nope')
    expect(useAutosaveStatusStore.getState().entries[key]).toBe(AutosaveStatus.Error)
  })
})

describe('selectAutosaveIndicatorStatus', () => {
  it('prefers saving over saved and error', () => {
    expect(
      selectAutosaveIndicatorStatus({
        a: AutosaveStatus.Saved,
        b: AutosaveStatus.Saving,
        c: AutosaveStatus.Error,
      }),
    ).toBe(AutosaveStatus.Saving)
  })

  it('shows error when nothing is saving', () => {
    expect(
      selectAutosaveIndicatorStatus({
        a: AutosaveStatus.Saved,
        c: AutosaveStatus.Error,
      }),
    ).toBe(AutosaveStatus.Error)
  })

  it('is idle with no entries', () => {
    expect(selectAutosaveIndicatorStatus({})).toBe(AutosaveStatus.Idle)
  })
})
