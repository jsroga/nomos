'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GridBackgroundProps {
  className?: string
  size?: number
  stroke?: number
  color?: string
}

export const GridBackground = ({
  className,
  size = 50,
  stroke = 1,
  color = 'rgba(255, 255, 255, 0.1)',
}: GridBackgroundProps) => {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none [mask-image:linear-gradient(to_bottom,white,transparent)]',
        className
      )}
    >
      <div
        style={{
          backgroundImage: `linear-gradient(${color} ${stroke}px, transparent ${stroke}px), linear-gradient(to right, ${color} ${stroke}px, transparent ${stroke}px)`,
          backgroundSize: `${size}px ${size}px`,
        }}
        className="w-full h-full [transform-origin:0_0] animate-grid-flow"
      />
      {/* Gaming "Beams" or Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_800px_at_50%_200px,#3b82f640,transparent)]" />
    </div>
  )
}
