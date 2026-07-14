/** GlowEffect mode, blur, and default color constants. */

export enum GlowEffectMode {
  Static = 'static',
  ColorShift = 'colorShift',
  Shine = 'shine',
  Spotlight = 'spotlight',
}

export enum GlowBlurLevel {
  Soft = 'soft',
  Medium = 'medium',
  Strong = 'strong',
}

export enum GlowBlurClass {
  Soft = 'blur-xl',
  Medium = 'blur-2xl',
  Strong = 'blur-3xl',
}

export enum GlowEase {
  Linear = 'linear',
}

export const GLOW_DEFAULT_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F'] as const

export const GLOW_GRADIENT_JOINER = ', ' as const
