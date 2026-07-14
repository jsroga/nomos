import type { LucideIcon } from 'lucide-react'

export type SelectedFeature = {
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
}

export enum ApiIntegrationTab {
  Rest = 'rest',
  Mcp = 'mcp',
}

export enum FeatureDeepDiveAlign {
  Left = 'left',
  Right = 'right',
}

export type FeatureDeepDiveConfig = {
  index: number
  title: string
  subtitle: string
  description: string
  type3d: string
  align?: `${FeatureDeepDiveAlign}`
  color?: string
  modelScale?: number
  modelOffsetX?: number
  modelOffsetY?: number
  density?: number
  glowScale?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  vignette?: boolean
  pngIcon?: string
  screenshotPlaceholder?: boolean
}
