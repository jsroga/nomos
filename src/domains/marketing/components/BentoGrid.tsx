'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-6 gap-4 w-full', className)}>{children}</div>
  )
}

interface BentoCardProps {
  children: React.ReactNode
  className?: string
  span?: 1 | 2 | 3 | 4 | 5 | 6
  rowSpan?: 1 | 2 | 3
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className,
  span = 2,
  rowSpan = 1,
}) => {
  const spanClass = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
  }[span]

  const rowSpanClass = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  }[rowSpan]

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-sm border-4 border-black p-8',
        'transition-all duration-300',
        'hover:bg-white/10 hover:shadow-[8px_8px_0_0_#000]',
        spanClass,
        rowSpanClass,
        className
      )}
    >
      {children}
    </div>
  )
}
