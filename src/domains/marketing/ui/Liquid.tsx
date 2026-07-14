'use client'

import { LIQUID_GL_INIT_FAILED_LOG } from '@/domains/marketing/constants/liquid'
import { useEffect, useRef, useState } from 'react'

interface LiquidProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  // LiquidGL Options
  resolution?: number
  refraction?: number
  bevelDepth?: number
  bevelWidth?: number
  intensity?: number
  speed?: number
  specular?: boolean
  frost?: number
  text?: string | null
  snapshot?: string | HTMLElement | null
}

declare global {
  interface Window {
    liquidGL: (options: any) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __liquidGLRenderer__: any
  }
}

export function Liquid({
  children,
  className = '',
  style = {},
  resolution = 2.0,
  refraction = 0.015, // Reverted to default
  bevelDepth = 0.1, // Reverted to default
  bevelWidth = 0.01, // Reverted to default
  intensity, // No default here
  speed = 1.0,
  specular = true,
  frost = 0.05, // Reverted to default
  text = null,
  snapshot,
}: LiquidProps) {
  // Use state for ID to ensure hydration matches (starts empty, set on mount)
  const [id, setId] = useState<string>('')

  useEffect(() => {
    setId(`liquid-${Math.random().toString(36).slice(2, 11)}`)
  }, [])

  const lensRef = useRef<any>(null)

  useEffect(() => {
    if (!id) return // Wait for ID to be set

    let attempts = 0
    const maxAttempts = 100 // 10 seconds
    let timer: NodeJS.Timeout

    // Only initialize if we don't have a lens yet
    if (lensRef.current) return

    const initLiquid = () => {
      const elementExists = document.getElementById(id)

      // @ts-expect-error - liquidGL and html2canvas are dynamically loaded globals
      if (window.liquidGL && window.html2canvas && elementExists) {
        // Add safety delay to allow background/layout to stabilize
        timer = setTimeout(() => {
          if (lensRef.current) return // Double check

          console.log(`Initializing LiquidGL for #${id}`)
          try {
            const lens = window.liquidGL({
              target: `#${id}`,
              snapshot,
              resolution,
              refraction,
              bevelDepth,
              bevelWidth,
              intensity: intensity ?? speed,
              specular,
              frost,
              text,
            })
            lensRef.current = lens
          } catch (err) {
            console.error(LIQUID_GL_INIT_FAILED_LOG, err)
          }
        }, 200)
      } else if (attempts < maxAttempts) {
        attempts++
        timer = setTimeout(initLiquid, 100)
      } else {
        console.warn(`LiquidGL failed to load dependencies after 10s for #${id}`)
      }
    }

    // Start polling
    initLiquid()

    return () => {
      clearTimeout(timer)
    }
  }, [id]) // Only run on ID change (mount)

  // Update options when props change
  useEffect(() => {
    if (lensRef.current) {
      const lens = lensRef.current
      lens.options.resolution = resolution
      lens.options.refraction = refraction
      lens.options.bevelDepth = bevelDepth
      lens.options.bevelWidth = bevelWidth
      lens.options.intensity = intensity ?? speed
      lens.options.specular = specular
      lens.options.frost = frost
      lens.options.text = text

      // Force metrics update in case layout shifted or to apply changes
      // console.log("Updating Liquid Lens Options:", { ...lens.options })
      if (lens.updateMetrics) lens.updateMetrics()
    }
  }, [resolution, refraction, bevelDepth, bevelWidth, intensity, speed, specular, frost, text])

  return (
    <div
      className={`relative w-full h-full isolate ${className}`}
      style={style}
      data-liquid-ignore="true" // Prevent html2canvas from capturing this component (avoiding duplication)
    >
      {/* 
                LiquidGL Target:
                This element is targeted by the library, which reads its metrics/styles 
                and then hides it (opacity: 0). We use absolute positioning to match 
                the container size. We add rounded-2xl to match the cards.
            */}
      <div id={id} className="absolute inset-0 rounded-2xl" style={{ zIndex: 0 }} />

      {/* 
                Content:
                rendered above the hidden target, ensuring it remains visible.
            */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  )
}
