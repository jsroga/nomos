export function shouldShowSelectModeToolbar(input: {
  isSelectMode: boolean
  isSegmenting: boolean
  hasMask: boolean
}): boolean {
  if (!input.isSelectMode) return false
  return input.isSegmenting || input.hasMask
}
