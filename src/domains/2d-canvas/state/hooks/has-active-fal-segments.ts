export function hasActiveFalSegments(
  assets: ReadonlyArray<{ metadata?: { bounds?: { x: number; y: number; width: number; height: number } } }>,
  selectedMask: { imageUrl?: string } | null,
): boolean {
  if (selectedMask?.imageUrl) return true
  return assets.some(asset => Boolean(asset.metadata?.bounds))
}
