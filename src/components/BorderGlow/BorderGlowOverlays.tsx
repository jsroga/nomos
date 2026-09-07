import type { CSSProperties, ReactNode } from 'react'
import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  BorderGlowBackground,
  BorderGlowBlend,
  BorderGlowClass,
  BorderGlowCss,
  BorderGlowTransition,
} from './constants/border-glow'
import { buildGlowBoxShadow } from './border-glow-math'

function coneMask(angleDeg: string, coneSpread: number): string {
  return `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`
}

function fillMask(angleDeg: string): string {
  return [
    BorderGlowCss.FillMaskBase,
    BorderGlowCss.FillMaskCenter,
    BorderGlowCss.FillMaskSe,
    BorderGlowCss.FillMaskNw,
    BorderGlowCss.FillMaskNe,
    BorderGlowCss.FillMaskSw,
    `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
  ].join(StringSeparator.CommaSpace)
}

function outerMask(angleDeg: string): string {
  return `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`
}

export function BorderGlowOverlays({
  backgroundColor,
  borderBg,
  fillBg,
  angleDeg,
  coneSpread,
  borderOpacity,
  fillOpacity,
  glowOpacity,
  glowRadius,
  glowColor,
  glowIntensity,
  isVisible,
  lightSurface,
}: {
  backgroundColor: string
  borderBg: readonly string[]
  fillBg: readonly string[]
  angleDeg: string
  coneSpread: number
  borderOpacity: number
  fillOpacity: number
  glowOpacity: number
  glowRadius: number
  glowColor: string
  glowIntensity: number
  isVisible: boolean
  lightSurface: boolean
}): ReactNode {
  const fade = isVisible ? BorderGlowTransition.Visible : BorderGlowTransition.Hidden
  const punch = backgroundColor === BorderGlowBackground.Transparent ? BorderGlowBackground.Card : backgroundColor
  const borderStyle: CSSProperties = {
    border: BorderGlowCss.TransparentBorder,
    background: [
      `linear-gradient(${punch} 0 100%) padding-box`,
      'linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box',
      ...borderBg,
    ].join(StringSeparator.CommaSpace),
    opacity: borderOpacity,
    maskImage: coneMask(angleDeg, coneSpread),
    WebkitMaskImage: coneMask(angleDeg, coneSpread),
    transition: fade,
  }
  const fillMaskImage = fillMask(angleDeg)
  const fillStyle: CSSProperties = {
    border: BorderGlowCss.TransparentBorder,
    background: fillBg.join(StringSeparator.CommaSpace),
    maskImage: fillMaskImage,
    WebkitMaskImage: fillMaskImage,
    maskComposite: BorderGlowCss.MaskComposite,
    WebkitMaskComposite: BorderGlowCss.WebkitMaskComposite,
    opacity: borderOpacity * fillOpacity,
    mixBlendMode: lightSurface ? BorderGlowBlend.Normal : BorderGlowBlend.SoftLight,
    transition: fade,
  }
  const outerMaskImage = outerMask(angleDeg)
  const outerStyle: CSSProperties = {
    inset: `${-glowRadius}px`,
    maskImage: outerMaskImage,
    WebkitMaskImage: outerMaskImage,
    opacity: glowOpacity,
    mixBlendMode: lightSurface ? BorderGlowBlend.Normal : BorderGlowBlend.PlusLighter,
    transition: fade,
  }
  const innerGlowStyle: CSSProperties = {
    inset: `${glowRadius}px`,
    boxShadow: buildGlowBoxShadow(glowColor, glowIntensity),
  }
  return (
    <>
      <div className={BorderGlowClass.Layer} style={borderStyle} />
      <div className={BorderGlowClass.Layer} style={fillStyle} />
      <span className={BorderGlowClass.Outer} style={outerStyle}>
        <span className={BorderGlowClass.OuterInner} style={innerGlowStyle} />
      </span>
    </>
  )
}
