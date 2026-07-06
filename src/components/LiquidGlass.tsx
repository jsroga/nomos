'use client'

import React from 'react'
import { Liquid } from '@/domains/marketing'
import { cn } from '@/shared/data/utils'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  intensity?: number
  speed?: number
  frosted?: boolean
  enableWebGL?: boolean
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className,
  intensity = 0.2,
  speed = 0.5,
  frosted = true,
  enableWebGL = false, // Default to false for performance
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Liquid Background Layer (WebGL) - Only if enabled */}
      {enableWebGL && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <Liquid
            intensity={intensity}
            speed={speed}
            refraction={0.04}
            bevelWidth={0.02}
            bevelDepth={1.0}
            frost={frosted ? 0.5 : 0}
            resolution={1.0}
          >
            <div />
          </Liquid>
        </div>
      )}

      {/* Glassmorphism Overlay (CSS Fallback/Overlay) */}
      <div
        className={cn(
          'absolute inset-0 z-0 border border-white/10 transition-all duration-500',
          enableWebGL
            ? 'bg-background/40 backdrop-blur-md'
            : 'bg-background/60 backdrop-blur-xl' // Stronger blur/opacity when WebGL is off
        )}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  )
}
