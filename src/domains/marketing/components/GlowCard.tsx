'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// Bento Grid Container
interface GlowGridProps {
  children: React.ReactNode
  className?: string
  cols?: 2 | 3 | 4 | 6
}

export const GlowGrid: React.FC<GlowGridProps> = ({ children, className, cols = 3 }) => {
  const colClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    6: 'md:grid-cols-6',
  }

  return <div className={cn('grid grid-cols-1 gap-6', colClasses[cols], className)}>{children}</div>
}

// Glow Card with Bento span support
interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: 'pink' | 'cyan' | 'purple' | 'blue'
  icon?: React.ReactNode
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3
  tilt?: boolean
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className,
  glowColor = 'pink',
  icon,
  colSpan = 1,
  rowSpan = 1,
  tilt = false,
}) => {
  const glowColors = {
    pink: {
      border: 'border-pink-500/20',
      glow: 'shadow-[0_0_40px_rgba(236,72,153,0.1),inset_0_0_20px_rgba(236,72,153,0.02)]',
      hoverGlow:
        'hover:shadow-[0_0_60px_rgba(236,72,153,0.2),inset_0_0_30px_rgba(236,72,153,0.05)]',
      accent: 'from-pink-500/40 via-pink-500/5 to-transparent',
      iconBg: 'text-pink-400',
    },
    cyan: {
      border: 'border-cyan-500/20',
      glow: 'shadow-[0_0_40px_rgba(6,182,212,0.1),inset_0_0_20px_rgba(6,182,212,0.02)]',
      hoverGlow: 'hover:shadow-[0_0_60px_rgba(6,182,212,0.2),inset_0_0_30px_rgba(6,182,212,0.05)]',
      accent: 'from-cyan-500/40 via-cyan-500/5 to-transparent',
      iconBg: 'text-cyan-400',
    },
    purple: {
      border: 'border-purple-500/20',
      glow: 'shadow-[0_0_40px_rgba(168,85,247,0.1),inset_0_0_20px_rgba(168,85,247,0.02)]',
      hoverGlow:
        'hover:shadow-[0_0_60px_rgba(168,85,247,0.2),inset_0_0_30px_rgba(168,85,247,0.05)]',
      accent: 'from-purple-500/40 via-purple-500/5 to-transparent',
      iconBg: 'text-purple-400',
    },
    blue: {
      border: 'border-blue-500/20',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.1),inset_0_0_20px_rgba(59,130,246,0.02)]',
      hoverGlow:
        'hover:shadow-[0_0_60px_rgba(59,130,246,0.2),inset_0_0_30px_rgba(59,130,246,0.05)]',
      accent: 'from-blue-500/40 via-blue-500/5 to-transparent',
      iconBg: 'text-blue-400',
    },
  }

  const colSpanClasses = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  }

  const rowSpanClasses = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  }

  const colors = glowColors[glowColor]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[2.5rem]',
        'bg-[#0a0a0a]/40 backdrop-blur-2xl',
        'border',
        colors.border,
        colors.glow,
        colors.hoverGlow,
        'transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:bg-[#0a0a0a]/60 hover:-translate-y-2 hover:scale-[1.02]',
        tilt && 'md:odd:rotate-1 md:even:-rotate-1',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

      {/* Top accent gradient line */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[1px] opacity-50 group-hover:opacity-100 transition-opacity',
          'bg-gradient-to-r',
          colors.accent
        )}
      />

      {/* Dynamic light streak */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div
          className={cn(
            'absolute -inset-[100%] animate-[spin_8s_linear_infinite] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent',
            'mix-blend-overlay'
          )}
        />
      </div>

      {/* Corner glow accents */}
      <div
        className={cn(
          'absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500',
          glowColor === 'pink' && 'bg-pink-500',
          glowColor === 'cyan' && 'bg-cyan-500',
          glowColor === 'purple' && 'bg-purple-500',
          glowColor === 'blue' && 'bg-blue-500'
        )}
      />

      <div className="relative p-8 h-full flex flex-col">
        {icon && (
          <div
            className={cn(
              'mb-6 p-3 w-fit rounded-lg bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500',
              colors.iconBg
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

interface NumberedCardProps {
  children: React.ReactNode
  number: string
  title: string
  className?: string
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2
}

export const NumberedCard: React.FC<NumberedCardProps> = ({
  children,
  number,
  title,
  className,
  colSpan = 1,
  rowSpan = 1,
}) => {
  const colSpanClasses = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  }

  const rowSpanClasses = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
        'backdrop-blur-sm',
        'border border-white/10',
        'p-6',
        'transition-all duration-300',
        'hover:border-white/20',
        'hover:bg-slate-800/60',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      <span className="text-4xl font-extralight text-white/20 mb-4 block">{number}</span>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{children}</p>
    </div>
  )
}
