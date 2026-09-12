import { create } from 'zustand'
import { AUTOSAVE_SAVED_VISIBLE_MS, AutosaveStatus } from '@/shared/workspace/constants/autosave'

interface AutosaveStatusState {
  entries: Record<string, AutosaveStatus>
  begin: (key: string) => void
  succeed: (key: string) => void
  fail: (key: string) => void
}

const savedTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearSavedTimer(key: string): void {
  const timer = savedTimers.get(key)
  if (timer) clearTimeout(timer)
  savedTimers.delete(key)
}

export const useAutosaveStatusStore = create<AutosaveStatusState>(set => ({
  entries: {},
  begin: key => {
    clearSavedTimer(key)
    set(state => ({ entries: { ...state.entries, [key]: AutosaveStatus.Saving } }))
  },
  succeed: key => {
    clearSavedTimer(key)
    set(state => ({ entries: { ...state.entries, [key]: AutosaveStatus.Saved } }))
    savedTimers.set(
      key,
      setTimeout(() => {
        savedTimers.delete(key)
        useAutosaveStatusStore.setState(state => {
          const next = { ...state.entries }
          if (next[key] === AutosaveStatus.Saved) Reflect.deleteProperty(next, key)
          return { entries: next }
        })
      }, AUTOSAVE_SAVED_VISIBLE_MS),
    )
  },
  fail: key => {
    clearSavedTimer(key)
    set(state => ({ entries: { ...state.entries, [key]: AutosaveStatus.Error } }))
  },
}))

export function selectAutosaveIndicatorStatus(
  entries: Record<string, AutosaveStatus>,
): AutosaveStatus {
  const values = Object.values(entries)
  if (values.includes(AutosaveStatus.Saving)) return AutosaveStatus.Saving
  if (values.includes(AutosaveStatus.Error)) return AutosaveStatus.Error
  if (values.includes(AutosaveStatus.Saved)) return AutosaveStatus.Saved
  return AutosaveStatus.Idle
}
