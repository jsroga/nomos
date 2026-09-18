const MIN_SECTIONS_FOR_CONFIRM = 2

/** Confirm only when two or more sections land and at least one is unexpected. */
export function shouldConfirmAddToWorldOverwrite(input: {
  targetSections: readonly string[]
  requestedSection: string | undefined
}): boolean {
  if (input.targetSections.length < MIN_SECTIONS_FOR_CONFIRM) return false
  if (!input.requestedSection) return true
  return input.targetSections.some(section => section !== input.requestedSection)
}
