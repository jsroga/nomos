'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { LiquidProvider } from '@/domains/marketing/context/LiquidContext'

const TurbulentBackground = dynamic(
  () => import('@/domains/marketing/components/TurbulentBackground').then(mod => mod.TurbulentBackground),
  { ssr: false }
)

interface LiquidBackgroundProviderProps {
  children: React.ReactNode
  showCanvas?: boolean
}

export function LiquidBackgroundProvider({
  children,
  showCanvas = true,
}: LiquidBackgroundProviderProps) {
  // Static values for Turbulent Background
  const zoom = 0.1
  const rotation = 3.33
  const speed = 0.5
  const morphSpeed = 0.2

  // State for Liquid Context (to be consumed by Liquid components)
  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

  // Default Liquid Options for the app - matching Landing Page "sexy" defaults
  const liquidOptions = {
    refraction: 0.064,
    bevelWidth: 0.042,
    bevelDepth: 2.0,
    intensity: 0.0,
    frost: 1.0,
    specular: true,
    speed: speed,
  }

  // Live Texture Bridge - Keeps the liquid effect synced with the canvas
  useEffect(() => {
    let rafId: number
    const updateTexture = () => {
      const bgCanvas = document.getElementById('turbulent-bg-canvas') as HTMLCanvasElement
      const renderer = (window as any).__liquidGLRenderer__

      if (bgCanvas && renderer && renderer._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }

    // Start loop
    rafId = requestAnimationFrame(updateTexture)

    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <TurbulentBackground
      zoom={zoom}
      rotation={rotation}
      speed={speed}
      morphSpeed={morphSpeed}
      onRef={setBgElement}
      showCanvas={showCanvas}
      // Fixed dark theme values
      colorShift={0}
      saturation={0.4} // Reduced saturation for background
      brightness={1.5}
      contrast={1.2}
      hue={0}
    >
      <LiquidProvider value={{ bgElement, liquidOptions }}>{children}</LiquidProvider>
    </TurbulentBackground>
  )
}
