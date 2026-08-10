/** Render quality presets for the 3D canvas editor. */

export enum RenderQuality {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export const RENDER_QUALITY_VALUES: RenderQuality[] = [
  RenderQuality.Low,
  RenderQuality.Medium,
  RenderQuality.High,
]

export const RENDER_QUALITY_LABELS: Record<RenderQuality, string> = {
  [RenderQuality.Low]: 'Low',
  [RenderQuality.Medium]: 'Medium',
  [RenderQuality.High]: 'High',
}

export enum CanvasFrameloopMode {
  Always = 'always',
  Never = 'never',
  Demand = 'demand',
}

export enum ShadowMapSize {
  Off = 0,
  Medium = 1024,
  High = 2048,
}

/** Device pixel ratio caps — Low and Medium share the same DPR. */
export const RenderQualityDpr = {
  Low: 1,
  Medium: 1,
  HighMax: 1.5,
} as const

export type RenderQualityDprValue = (typeof RenderQualityDpr)[keyof typeof RenderQualityDpr]

export enum HeightmapVersionThrottleMs {
  MinInterval = 33,
}

export enum ScatterSpawnIntervalMs {
  Min = 150,
}

export enum RoadExtrudeSteps {
  Min = 20,
  Max = 80,
  PerUnitLength = 3,
}

export enum InteractionIdleMs {
  RestoreDelay = 280,
}

export enum CanvasPerfHudSampleMs {
  Interval = 1000,
}

export enum CanvasPerfHudCopy {
  Title = '3D Canvas Perf',
  Hint = 'NEXT_PUBLIC_FF_PERF_DEBUG=true',
}

export enum DocumentVisibilityStateValue {
  Hidden = 'hidden',
}

export enum DomVisibilityEvent {
  VisibilityChange = 'visibilitychange',
}
