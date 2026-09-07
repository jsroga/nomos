import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  BORDER_GLOW_COLOR_MAP,
  BORDER_GLOW_GRADIENT_POSITIONS,
  BORDER_GLOW_HSL_FALLBACK,
  BORDER_GLOW_LAYOUT,
  BORDER_GLOW_MESH_COLORS,
  BorderGlowCss,
} from './constants/border-glow'

export function parseGlowHsl(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/)
  const h = match?.[1]
  const s = match?.[2]
  const l = match?.[3]
  if (h === undefined || s === undefined || l === undefined) {
    return {
      h: BORDER_GLOW_HSL_FALLBACK.h,
      s: BORDER_GLOW_HSL_FALLBACK.s,
      l: BORDER_GLOW_HSL_FALLBACK.l,
    }
  }
  return { h: Number.parseFloat(h), s: Number.parseFloat(s), l: Number.parseFloat(l) }
}

type ShadowLayer = readonly [number, number, number, number, number, boolean]

const SHADOW_LAYERS: readonly ShadowLayer[] = [
  [0, 0, 0, 1, 100, true],
  [0, 0, 1, 0, 60, true],
  [0, 0, 3, 0, 50, true],
  [0, 0, 6, 0, 40, true],
  [0, 0, 15, 0, 30, true],
  [0, 0, 25, 2, 20, true],
  [0, 0, 50, 2, 10, true],
  [0, 0, 1, 0, 60, false],
  [0, 0, 3, 0, 50, false],
  [0, 0, 6, 0, 40, false],
  [0, 0, 15, 0, 30, false],
  [0, 0, 25, 2, 20, false],
  [0, 0, 50, 2, 10, false],
]

export function buildGlowBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseGlowHsl(glowColor)
  const base = `${h}deg ${s}% ${l}%`
  return SHADOW_LAYERS.map(([x, y, blur, spread, alpha, inset]) => {
    const a = Math.min(alpha * intensity, 100)
    const insetPrefix = inset ? BorderGlowCss.InsetPrefix : ''
    return `${insetPrefix}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`
  }).join(StringSeparator.CommaSpace)
}

function meshColorAt(colors: readonly string[], index: number): string {
  const mapped = BORDER_GLOW_COLOR_MAP[index] ?? 0
  const picked = colors[Math.min(mapped, colors.length - 1)]
  return picked ?? colors[0] ?? BORDER_GLOW_MESH_COLORS[0]
}

export function buildMeshGradients(colors: readonly string[]): string[] {
  const gradients: string[] = []
  for (let i = 0; i < BORDER_GLOW_GRADIENT_POSITIONS.length; i += 1) {
    const position = BORDER_GLOW_GRADIENT_POSITIONS[i]
    if (position === undefined) continue
    gradients.push(`radial-gradient(at ${position}, ${meshColorAt(colors, i)} 0px, transparent 50%)`)
  }
  const base = colors[0] ?? BORDER_GLOW_MESH_COLORS[0]
  gradients.push(`linear-gradient(${base} 0 100%)`)
  return gradients
}

export function isLightHexColor(color: string): boolean {
  const value = color.trim().replace('#', '')
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false
  const hex =
    value.length === 3
      ? value
          .split('')
          .map(char => `${char}${char}`)
          .join('')
      : value
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > BORDER_GLOW_LAYOUT.lightLuma
}

export function glowEdgeProximity(width: number, height: number, x: number, y: number): number {
  const cx = width / 2
  const cy = height / 2
  const dx = x - cx
  const dy = y - cy
  let kx = Infinity
  let ky = Infinity
  if (dx !== 0) kx = cx / Math.abs(dx)
  if (dy !== 0) ky = cy / Math.abs(dy)
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
}

export function glowCursorAngle(width: number, height: number, x: number, y: number): number {
  const dx = x - width / 2
  const dy = y - height / 2
  if (dx === 0 && dy === 0) return 0
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  return degrees < 0 ? degrees + 360 : degrees
}

export function borderGlowLayerOpacity(input: {
  hovered: boolean
  sweepActive: boolean
  edgeProximity: number
  edgeSensitivity: number
}): { isVisible: boolean; borderOpacity: number; glowOpacity: number } {
  const isVisible = input.hovered || input.sweepActive
  if (!isVisible) return { isVisible: false, borderOpacity: 0, glowOpacity: 0 }
  const colorSensitivity = input.edgeSensitivity + BORDER_GLOW_LAYOUT.colorSensitivityPad
  const scaled = input.edgeProximity * 100
  const borderSpan = 100 - colorSensitivity
  const glowSpan = 100 - input.edgeSensitivity
  return {
    isVisible: true,
    borderOpacity: borderSpan === 0 ? 0 : Math.max(0, (scaled - colorSensitivity) / borderSpan),
    glowOpacity: glowSpan === 0 ? 0 : Math.max(0, (scaled - input.edgeSensitivity) / glowSpan),
  }
}
