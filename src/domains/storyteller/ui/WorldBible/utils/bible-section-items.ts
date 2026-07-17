export function planItems<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

/** Editing: local draft only. Viewing: prefer saved local draft, fall back to server plan. */
export function bibleSectionItems<T>(local: unknown, saved: unknown, editing: boolean): T[] {
  const draft = planItems<T>(local)
  return editing || draft.length > 0 ? draft : planItems<T>(saved)
}

/** List sections that merge localPlan with storyPlan when not editing. */
export function bibleMergedDisplayList<T>(
  isEditing: boolean,
  local: T[] | undefined | null,
  saved: T[] | undefined | null
): T[] {
  if (isEditing) return local ?? []
  return local ?? saved ?? []
}
