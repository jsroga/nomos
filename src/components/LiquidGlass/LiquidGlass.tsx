'use client'

import React from 'react'
import { cn } from '@/shared/data/utils'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  /** @deprecated Ignored — CSS blur only (WebGL liquid removed from app shell). */
  intensity?: number
  /** @deprecated Ignored — CSS blur only. */
  speed?: number
  /** @deprecated Ignored — CSS blur only. */
  frosted?: boolean
  /** @deprecated Ignored — CSS blur only. */
  enableWebGL?: boolean
}

/** Frosted glass panel via CSS backdrop-filter (no WebGL / liquidGL). */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({ children, className }) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 z-0 border border-white/10 bg-background/60 backdrop-blur-xl transition-all duration-500" />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  )
}
