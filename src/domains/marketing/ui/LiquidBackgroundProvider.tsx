'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { LiquidProvider } from '../state/liquid-context'

const TurbulentBackground = dynamic(
  () => import('./TurbulentBackground').then(mod => mod.TurbulentBackground),
  { ssr: false }
)

interface LiquidBackgroundProviderProps {
  children: React.ReactNode
  showCanvas?: boolean
}

/** Marketing/landing only. App shell should not wrap chrome in this. */
export function LiquidBackgroundProvider({
  children,
  showCanvas = true,
}: LiquidBackgroundProviderProps) {
  const zoom = 0.1
  const rotation = 3.33
  const speed = 0.5
  const morphSpeed = 0.2

  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

  const liquidOptions = {
    refraction: 0.064,
    bevelWidth: 0.042,
    bevelDepth: 2.0,
    intensity: 0.0,
    frost: 1.0,
    specular: true,
    speed: speed,
  }

  if (!showCanvas) {
    return (
      <LiquidProvider value={{ bgElement: null, liquidOptions }}>{children}</LiquidProvider>
    )
  }

  return (
    <TurbulentBackground
      zoom={zoom}
      rotation={rotation}
      speed={speed}
      morphSpeed={morphSpeed}
      onRef={setBgElement}
      showCanvas={showCanvas}
      colorShift={0}
      saturation={0.4}
      brightness={1.5}
      contrast={1.2}
      hue={0}
    >
      <LiquidProvider value={{ bgElement, liquidOptions }}>{children}</LiquidProvider>
    </TurbulentBackground>
  )
}
