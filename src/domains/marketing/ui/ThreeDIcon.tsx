'use client'

import React, { useRef, useEffect, Suspense, lazy } from 'react'
import {
  MARKETING_THREE_D_VIGNETTE_MASK,
  MarketingDomEvent,
  MarketingThreeDLayout,
} from '@/domains/marketing/constants/three-d-icon'

const ThreeDIconCanvas = lazy(async () => ({
  default: (await import('./ThreeDIconCanvas')).ThreeDIconCanvas,
}))

interface ThreeDIconProps {
  type: string
  color?: string
  size?: number
  scale?: number
  offset?: [number, number]
  density?: number
  glowScale?: number
  mouseRotation?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  vignette?: boolean
}

export function ThreeDIcon({
  type,
  size = 180,
  scale: propScale,
  offset = [0, 0],
  density,
  glowScale,
  distortion,
  speed,
  mouseRotation,
  frequency,
  contrast,
  twist,
  metalness,
  vignette = false,
}: ThreeDIconProps) {
  const scale = propScale ?? Math.max(1, size / 180)
  const mousePosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!mouseRotation) return
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mousePosition.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener(MarketingDomEvent.MouseMove, handleMouseMove)
    return () => window.removeEventListener(MarketingDomEvent.MouseMove, handleMouseMove)
  }, [mouseRotation])

  const containerStyle: React.CSSProperties = {
    width: MarketingThreeDLayout.Full,
    height: MarketingThreeDLayout.Full,
    position: MarketingThreeDLayout.Relative,
    ...(vignette
      ? {
          WebkitMaskImage: MARKETING_THREE_D_VIGNETTE_MASK,
          maskImage: MARKETING_THREE_D_VIGNETTE_MASK,
        }
      : {}),
  }

  return (
    <div style={containerStyle}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        }
      >
        <ThreeDIconCanvas
          type={type}
          scale={scale}
          offset={offset}
          density={density}
          glowScale={glowScale}
          distortion={distortion}
          speed={speed}
          mouseRotation={mouseRotation}
          frequency={frequency}
          contrast={contrast}
          twist={twist}
          metalness={metalness}
          mousePosition={mousePosition}
        />
      </Suspense>
    </div>
  )
}
