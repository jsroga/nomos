export function isAssetOverlayVisible(
  showAllAssetMasks: boolean,
  previewAssetId: string | null,
): boolean {
  return showAllAssetMasks || previewAssetId !== null
}

export function nextAssetOverlayEyeToggle(
  showAllAssetMasks: boolean,
  previewAssetId: string | null,
): { showAllAssetMasks: boolean; previewAssetId: string | null } {
  if (isAssetOverlayVisible(showAllAssetMasks, previewAssetId)) {
    return { showAllAssetMasks: false, previewAssetId: null }
  }
  return { showAllAssetMasks: true, previewAssetId }
}
