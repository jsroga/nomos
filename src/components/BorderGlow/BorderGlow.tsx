'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/shared/data/utils'
import { animateBorderGlowValue, BorderGlowEase, borderGlowEase } from './border-glow-animate'
import { BorderGlowOverlays } from './BorderGlowOverlays'
import {
  borderGlowLayerOpacity,
  buildMeshGradients,
  glowCursorAngle,
  glowEdgeProximity,
  isLightHexColor,
} from './border-glow-math'
import {
  BORDER_GLOW_ANIMATE,
  BORDER_GLOW_LAYOUT,
  BORDER_GLOW_MESH_COLORS,
  BorderGlowBackground,
  BorderGlowClass,
  BorderGlowCss,
  BorderGlowEdge,
  BorderGlowShadow,
  BorderGlowSurface,
} from './constants/border-glow'

export interface BorderGlowProps {
  children?: ReactNode
  className?: string
  surface?: `${BorderGlowSurface}`
  edgeSensitivity?: number
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: readonly string[]
  fillOpacity?: number
}

function fieldDefaults(surface: `${BorderGlowSurface}`): {
  backgroundColor: string
  borderRadius: number
  glowRadius: number
  glowIntensity: number
  elevated: boolean
} {
  if (surface === BorderGlowSurface.Field) {
    return {
      backgroundColor: BorderGlowBackground.Transparent,
      borderRadius: BORDER_GLOW_LAYOUT.fieldRadius,
      glowRadius: BORDER_GLOW_LAYOUT.fieldGlowRadius,
      glowIntensity: BORDER_GLOW_LAYOUT.fieldGlowIntensity,
      elevated: false,
    }
  }
  return {
    backgroundColor: BorderGlowBackground.Card,
    borderRadius: BORDER_GLOW_LAYOUT.cardRadius,
    glowRadius: BORDER_GLOW_LAYOUT.cardGlowRadius,
    glowIntensity: BORDER_GLOW_LAYOUT.glowIntensity,
    elevated: true,
  }
}

export function BorderGlow({
  children,
  className,
  surface = BorderGlowSurface.Card,
  edgeSensitivity = BORDER_GLOW_LAYOUT.edgeSensitivity,
  glowColor = BorderGlowCss.GlowColor,
  backgroundColor,
  borderRadius,
  glowRadius,
  glowIntensity,
  coneSpread = BORDER_GLOW_LAYOUT.coneSpread,
  animated = false,
  colors = BORDER_GLOW_MESH_COLORS,
  fillOpacity = BORDER_GLOW_LAYOUT.fillOpacity,
}: BorderGlowProps) {
  const defaults = fieldDefaults(surface)
  const bg = backgroundColor ?? defaults.backgroundColor
  const radius = borderRadius ?? defaults.borderRadius
  const radiusPx = glowRadius ?? defaults.glowRadius
  const intensity = glowIntensity ?? defaults.glowIntensity
  const cardRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [cursorAngle, setCursorAngle] = useState(45)
  const [edgeProximity, setEdgeProximity] = useState(0)
  const [sweepActive, setSweepActive] = useState(false)

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    setEdgeProximity(glowEdgeProximity(rect.width, rect.height, x, y))
    setCursorAngle(glowCursorAngle(rect.width, rect.height, x, y))
  }, [])

  useEffect(() => {
    if (!animated) return
    setSweepActive(true)
    setCursorAngle(BORDER_GLOW_ANIMATE.angleStart)
    const sweepSpan = BORDER_GLOW_ANIMATE.angleEnd - BORDER_GLOW_ANIMATE.angleStart
    animateBorderGlowValue({
      duration: BORDER_GLOW_ANIMATE.proximityMs,
      onUpdate: value => setEdgeProximity(value / BORDER_GLOW_ANIMATE.full),
    })
    animateBorderGlowValue({
      ease: borderGlowEase(BorderGlowEase.InCubic),
      duration: BORDER_GLOW_ANIMATE.sweepInMs,
      end: BORDER_GLOW_ANIMATE.sweepMid,
      onUpdate: value => {
        setCursorAngle(sweepSpan * (value / BORDER_GLOW_ANIMATE.full) + BORDER_GLOW_ANIMATE.angleStart)
      },
    })
    animateBorderGlowValue({
      ease: borderGlowEase(BorderGlowEase.OutCubic),
      delay: BORDER_GLOW_ANIMATE.sweepOutDelayMs,
      duration: BORDER_GLOW_ANIMATE.sweepOutMs,
      start: BORDER_GLOW_ANIMATE.sweepMid,
      end: BORDER_GLOW_ANIMATE.full,
      onUpdate: value => {
        setCursorAngle(sweepSpan * (value / BORDER_GLOW_ANIMATE.full) + BORDER_GLOW_ANIMATE.angleStart)
      },
    })
    animateBorderGlowValue({
      ease: borderGlowEase(BorderGlowEase.InCubic),
      delay: BORDER_GLOW_ANIMATE.fadeDelayMs,
      duration: BORDER_GLOW_ANIMATE.fadeMs,
      start: BORDER_GLOW_ANIMATE.full,
      end: BORDER_GLOW_ANIMATE.zero,
      onUpdate: value => setEdgeProximity(value / BORDER_GLOW_ANIMATE.full),
      onEnd: () => setSweepActive(false),
    })
  }, [animated])

  const layers = borderGlowLayerOpacity({
    hovered,
    sweepActive,
    edgeProximity,
    edgeSensitivity,
  })
  const mesh = buildMeshGradients(colors)
  const lightSurface = isLightHexColor(bg)
  const boxShadow = defaults.elevated
    ? lightSurface
      ? BorderGlowShadow.Light
      : BorderGlowShadow.Dark
    : BorderGlowShadow.None

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(defaults.elevated ? BorderGlowClass.RootBordered : BorderGlowClass.Root, className)}
      style={{
        background: bg,
        borderColor: lightSurface ? BorderGlowEdge.Light : BorderGlowEdge.Dark,
        borderRadius: `${radius}px`,
        transform: 'translate3d(0, 0, 0.01px)',
        boxShadow,
      }}
    >
      <BorderGlowOverlays
        backgroundColor={bg}
        borderBg={mesh.map(gradient => `${gradient} border-box`)}
        fillBg={mesh.map(gradient => `${gradient} padding-box`)}
        angleDeg={`${cursorAngle.toFixed(3)}deg`}
        coneSpread={coneSpread}
        borderOpacity={layers.borderOpacity}
        fillOpacity={fillOpacity}
        glowOpacity={layers.glowOpacity}
        glowRadius={radiusPx}
        glowColor={glowColor}
        glowIntensity={intensity}
        isVisible={layers.isVisible}
        lightSurface={lightSurface}
      />
      <div className={BorderGlowClass.Content}>{children}</div>
    </div>
  )
}
