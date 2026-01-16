'use client'

import React from 'react'
import { Liquid } from '@/domains/marketing/components/Liquid'
import { cn } from '@/lib/utils'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  intensity?: number
  speed?: number
  frosted?: boolean
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className,
  intensity = 0.2, // Reduced from 0.5 (user asked for "a bit down")
  speed = 0.5,
  frosted = true,
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Liquid Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        {' '}
        {/* Reduced opacity from 60 to 40 */}
        <Liquid
          intensity={intensity}
          speed={speed}
          // Matching LandingPage defaults roughly but keeping it subtle
          refraction={0.04}
          bevelWidth={0.02}
          bevelDepth={1.0}
          frost={frosted ? 0.5 : 0} // Reduced frost slightly for clarity
          resolution={1.0}
        >
          {/* Passing empty children as Liquid expects children but we are using it as bg */}
          <div />
        </Liquid>
      </div>

      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-md border border-white/10" />

      {/* Content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  )
}
