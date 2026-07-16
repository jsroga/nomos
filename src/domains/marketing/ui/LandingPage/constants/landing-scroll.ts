export enum LandingScrollOffset {
  StartStart = 'start start',
  EndEnd = 'end end',
}

export enum LandingScrollEvent {
  Scroll = 'scroll',
}

export const LANDING_SCROLL_OVERLAY_RANGE = {
  start: 600,
  end: 700,
  opacityEnd: 0.75,
}

export interface LandingHeroScrollSpring {
  stiffness: number
  damping: number
}

export interface LandingHeroMotionRange {
  inputStart: number
  inputEnd: number
  outputStart: number
  outputEnd: number
}

export const LANDING_HERO_SCROLL_SPRING: LandingHeroScrollSpring = {
  stiffness: 100,
  damping: 30,
}

export const LANDING_HERO_Y_RANGE: LandingHeroMotionRange = {
  inputStart: 0,
  inputEnd: 0.2,
  outputStart: 0,
  outputEnd: -100,
}

export const LANDING_HERO_OPACITY_RANGE: LandingHeroMotionRange = {
  inputStart: 0,
  inputEnd: 0.15,
  outputStart: 1,
  outputEnd: 0,
}
