/** Cursor-follow mesh border glow (React Bits BorderGlow, field-safe defaults). */

export enum BorderGlowSurface {
  Card = 'card',
  Field = 'field',
}

export enum BorderGlowClass {
  Root = 'relative grid isolate',
  RootBordered = 'relative grid isolate border',
  Content = 'relative z-[1] min-w-0 w-full',
  Layer = 'pointer-events-none absolute inset-0 -z-[1] rounded-[inherit]',
  Outer = 'pointer-events-none absolute z-[1] rounded-[inherit]',
  OuterInner = 'absolute rounded-[inherit]',
}

export enum BorderGlowBackground {
  Transparent = 'transparent',
  Card = '#120F17',
}

export enum BorderGlowBlend {
  Normal = 'normal',
  SoftLight = 'soft-light',
  PlusLighter = 'plus-lighter',
}

export enum BorderGlowTransition {
  Visible = 'opacity 0.25s ease-out',
  Hidden = 'opacity 0.75s ease-in-out',
}

export enum BorderGlowCss {
  TransparentBorder = '1px solid transparent',
  FillMaskBase = 'linear-gradient(to bottom, black, black)',
  FillMaskCenter = 'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
  FillMaskSe = 'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
  FillMaskNw = 'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
  FillMaskNe = 'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
  FillMaskSw = 'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
  MaskComposite = 'subtract, add, add, add, add, add',
  WebkitMaskComposite = 'source-out, source-over, source-over, source-over, source-over, source-over',
  InsetPrefix = 'inset ',
  GlowColor = '40 80 80',
}

export const BORDER_GLOW_HSL_FALLBACK = { h: 40, s: 80, l: 80 } as const

export const BORDER_GLOW_MESH_COLORS = ['#c084fc', '#f472b6', '#38bdf8'] as const

export const BORDER_GLOW_GRADIENT_POSITIONS = [
  '80% 55%',
  '69% 34%',
  '8% 6%',
  '41% 38%',
  '86% 85%',
  '82% 18%',
  '51% 4%',
] as const

export const BORDER_GLOW_COLOR_MAP = [0, 1, 2, 0, 1, 2, 1] as const

export const BORDER_GLOW_LAYOUT = {
  edgeSensitivity: 30,
  colorSensitivityPad: 20,
  cardRadius: 28,
  fieldRadius: 9,
  cardGlowRadius: 40,
  fieldGlowRadius: 16,
  glowIntensity: 1,
  fieldGlowIntensity: 0.85,
  coneSpread: 25,
  fillOpacity: 0.5,
  lightLuma: 180,
} as const

export const BORDER_GLOW_ANIMATE = {
  angleStart: 110,
  angleEnd: 465,
  proximityMs: 500,
  sweepInMs: 1500,
  sweepMid: 50,
  sweepOutMs: 2250,
  sweepOutDelayMs: 1500,
  fadeMs: 1500,
  fadeDelayMs: 2500,
  full: 100,
  zero: 0,
} as const

export enum BorderGlowShadow {
  Light = 'rgb(24 24 27 / 4%) 0 1px 2px, rgb(24 24 27 / 5%) 0 8px 24px',
  Dark = 'rgba(0,0,0,0.1) 0 1px 2px, rgba(0,0,0,0.1) 0 2px 4px, rgba(0,0,0,0.1) 0 4px 8px, rgba(0,0,0,0.1) 0 8px 16px, rgba(0,0,0,0.1) 0 16px 32px, rgba(0,0,0,0.1) 0 32px 64px',
  None = 'none',
}

export enum BorderGlowEdge {
  Light = 'rgb(24 24 27 / 12%)',
  Dark = 'rgb(255 255 255 / 15%)',
}
