/** World canvas asset overlay color palette. */

export enum AssetOverlayColor {
  Blue = '#3B82F6',
  Green = '#10B981',
  Amber = '#F59E0B',
  Pink = '#EC4899',
  Purple = '#8B5CF6',
  Cyan = '#06B6D4',
}

export enum AssetOverlayGlow {
  Blue = 'rgba(59, 130, 246, 0.6)',
  Green = 'rgba(16, 185, 129, 0.6)',
  Amber = 'rgba(245, 158, 11, 0.6)',
  Pink = 'rgba(236, 72, 153, 0.6)',
  Purple = 'rgba(139, 92, 246, 0.6)',
  Cyan = 'rgba(6, 182, 212, 0.6)',
}

export const ASSET_OVERLAY_COLORS = [
  { border: AssetOverlayColor.Blue, glow: AssetOverlayGlow.Blue },
  { border: AssetOverlayColor.Green, glow: AssetOverlayGlow.Green },
  { border: AssetOverlayColor.Amber, glow: AssetOverlayGlow.Amber },
  { border: AssetOverlayColor.Pink, glow: AssetOverlayGlow.Pink },
  { border: AssetOverlayColor.Purple, glow: AssetOverlayGlow.Purple },
  { border: AssetOverlayColor.Cyan, glow: AssetOverlayGlow.Cyan },
] as const
