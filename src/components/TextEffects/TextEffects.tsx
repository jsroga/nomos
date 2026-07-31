'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LIQUID_DISTORTION_FONT_SIZE,
  LIQUID_FILTER_ID,
} from '@/components/TextEffects/constants/text-effects'

/**
 * DECRYPTED TEXT EFFECT
 * Matrix-style scrambling reveal.
 */

/**
 * FUZZY TEXT EFFECT
 * Canvas-based pixel distortion.
 */

/**
 * TEXT PRESSURE EFFECT
 * Responds to cursor proximity with variable weight/width.
 */

/**
 * MOTION HIGHLIGHT
 * Sliding background highlight for navigation.
 */
export const MotionHighlight = ({
  items,
  onSelect,
  className = '',
}: {
  items: string[]
  onSelect?: (item: string) => void
  className?: string
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <nav className={`relative flex items-center gap-2 ${className}`}>
      {items.map((item, i) => (
        <button
          key={item}
          className="relative px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white transition-colors z-10"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onSelect?.(item)}
        >
          {item}
          {hoveredIndex === i && (
            <motion.div
              layoutId="highlight"
              className="absolute inset-0 bg-primary/20 -z-10 rounded-md border border-primary/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </nav>
  )
}

/**
 * LIQUID DISTORTION TEXT
 * High-end SVG displacement map effect that mirrors fluid/turbulent background.
 * Optimized with robust filter bounds and SUBTLE intensity for a premium look.
 */
export const LiquidDistortionText = ({
  text,
  className = '',
  fontSize = LIQUID_DISTORTION_FONT_SIZE,
  animated = true,
}: {
  text: string
  className?: string
  fontSize?: string
  /** When false the displacement is static — same paint rect, no per-frame turbulence. */
  animated?: boolean
}) => {
  const filterStyle = { filter: `url(#${LIQUID_FILTER_ID})` }

  return (
    <div
      className={`relative ${className} group cursor-default py-4 px-4 md:py-8 md:px-20 overflow-visible flex items-center justify-center`}
    >
      <svg className="absolute w-0 h-0 pointer-events-none">
        <filter
          id={LIQUID_FILTER_ID}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.005 0.005"
            numOctaves="1"
            result="warp"
          >
            {animated && (
              <animate
                attributeName="baseFrequency"
                values="0.005 0.005; 0.008 0.01; 0.005 0.005"
                dur="10s"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            xChannelSelector="R"
            yChannelSelector="G"
            scale="20"
            in="SourceGraphic"
            in2="warp"
          />
        </filter>
      </svg>

      <div className="relative inline-block">
        <h1
          className={`${fontSize} font-black uppercase tracking-[-0.03em] font-syne text-white transition-all duration-700 leading-[0.95] text-center`}
          style={filterStyle}
        >
          {text}
        </h1>

        {/* Very subtle glow layer instead of aggressive ghost */}
        <h1
          className={`${fontSize} font-black uppercase tracking-[-0.03em] font-syne text-primary/10 absolute inset-0 -z-10 blur-xl pointer-events-none opacity-20 leading-[0.95] text-center translate-y-1`}
          style={filterStyle}
        >
          {text}
        </h1>
      </div>
    </div>
  )
}

/**
 * AGGRESSIVE GLITCH TEXT
 * Brutal chromatic aberration and segment-based glitching.
 */
