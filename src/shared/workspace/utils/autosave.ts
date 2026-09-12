import { AutosaveScope } from '@/shared/workspace/constants/autosave'
import { useAutosaveStatusStore } from '@/shared/workspace/autosave-status-store'

export function autosaveKey(scope: AutosaveScope, id: string): string {
  return `${scope}:${id}`
}

/** Call from any autosave path so the header globe reflects in-flight writes. */
export async function withAutosave<T>(key: string, run: () => Promise<T>): Promise<T> {
  const store = useAutosaveStatusStore.getState()
  store.begin(key)
  try {
    const result = await run()
    useAutosaveStatusStore.getState().succeed(key)
    return result
  } catch (error) {
    useAutosaveStatusStore.getState().fail(key)
    throw error
  }
}
