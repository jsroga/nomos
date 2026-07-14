/** TextEffects canvas, DOM, and animation wire constants. */

export const DECRYPTED_TEXT_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+' as const

export enum CanvasContextType {
  TwoD = '2d',
}

export enum CanvasFillStyle {
  White = 'white',
}

export enum CanvasTextAlign {
  Center = 'center',
}

export enum CanvasTextBaseline {
  Middle = 'middle',
}

export enum DomMouseEvent {
  MouseMove = 'mousemove',
}

export const LIQUID_DISTORTION_FONT_SIZE = 'text-[clamp(2.5rem,8vw,6.5rem)]' as const

export const GLITCH_SCRAMBLE_CHARSET = '01X_#!$?' as const
