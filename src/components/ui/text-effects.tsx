'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * DECRYPTED TEXT EFFECT
 * Matrix-style scrambling reveal.
 */
export const DecryptedText = ({
  text,
  speed = 50,
  maxIterations = 10,
  className = '',
}: {
  text: string
  speed?: number
  maxIterations?: number
  className?: string
}) => {
  const [displayText, setDisplayText] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'

  useEffect(() => {
    let iteration = 0
    let interval: NodeJS.Timeout

    const startAnimation = () => {
      interval = setInterval(() => {
        setDisplayText(prev => {
          return text
            .split('')
            .map((char, index) => {
              if (index < iteration / maxIterations) {
                return text[index]
              }
              return chars[Math.floor(Math.random() * chars.length)]
            })
            .join('')
        })

        iteration += 1
        if (iteration >= text.length * maxIterations) {
          setDisplayText(text)
          clearInterval(interval)
        }
      }, speed)
    }

    startAnimation()
    return () => clearInterval(interval)
  }, [text, speed, maxIterations])

  return <span className={className}>{displayText}</span>
}

/**
 * FUZZY TEXT EFFECT
 * Canvas-based pixel distortion.
 */
export const FuzzyText = ({
  text,
  className = '',
  baseIntensity = 0.1,
  hoverIntensity = 0.5,
  fontSize = 80,
}: {
  text: string
  className?: string
  baseIntensity?: number
  hoverIntensity?: number
  fontSize?: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [intensity, setIntensity] = useState(baseIntensity)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `bold ${fontSize}px Syne`
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const x = canvas.width / 2
      const y = canvas.height / 2

      // Draw fuzzy layers
      for (let i = 0; i < 5; i++) {
        ctx.save()
        const offsetX = (Math.random() - 0.5) * 20 * intensity
        const offsetY = (Math.random() - 0.5) * 5 * intensity
        ctx.globalAlpha = 0.2
        ctx.fillText(text, x + offsetX, y + offsetY)
        ctx.restore()
      }

      ctx.globalAlpha = 1
      ctx.fillText(text, x, y)

      animationFrame = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrame)
  }, [text, intensity, fontSize])

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIntensity(hoverIntensity)}
      onMouseLeave={() => setIntensity(baseIntensity)}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="max-w-full h-auto cursor-default pointer-events-none"
      />
    </div>
  )
}

/**
 * TEXT PRESSURE EFFECT
 * Responds to cursor proximity with variable weight/width.
 */
const PressureChar = ({
  char,
  mousePos,
  minWeight,
  maxWeight,
  containerRef,
}: {
  char: string
  mousePos: { x: number; y: number }
  minWeight: number
  maxWeight: number
  containerRef: React.RefObject<HTMLDivElement | null>
}) => {
  const charRef = useRef<HTMLSpanElement>(null)
  const [weight, setWeight] = useState(minWeight)

  useEffect(() => {
    if (!charRef.current || !containerRef.current) return
    const rect = charRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const containerRect = containerRef.current.getBoundingClientRect()
    const distance = Math.sqrt(
      Math.pow(window.scrollX + centerX - (mousePos.x + containerRect.left), 2) +
        Math.pow(window.scrollY + centerY - (mousePos.y + containerRect.top), 2)
    )

    const newWeight = Math.max(minWeight, maxWeight - distance * 2)
    setWeight(newWeight)
  }, [mousePos, minWeight, maxWeight, containerRef])

  return (
    <span
      ref={charRef}
      style={{ fontWeight: weight, transition: 'font-weight 0.1s ease-out' }}
      className="inline-block"
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

export const TextPressure = ({
  text,
  className = '',
  minWeight = 100,
  maxWeight = 900,
}: {
  text: string
  className?: string
  minWeight?: number
  maxWeight?: number
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className={`flex flex-wrap justify-center ${className}`}>
      {text.split('').map((char, i) => (
        <PressureChar
          key={i}
          char={char}
          mousePos={mousePos}
          minWeight={minWeight}
          maxWeight={maxWeight}
          containerRef={containerRef}
        />
      ))}
    </div>
  )
}

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
  fontSize = 'text-[clamp(2.5rem,8vw,6.5rem)]',
}: {
  text: string
  className?: string
  fontSize?: string
}) => {
  return (
    <div
      className={`relative ${className} group cursor-default py-8 px-12 md:px-20 overflow-visible flex items-center justify-center`}
    >
      <svg className="absolute w-0 h-0 pointer-events-none">
        <filter
          id="liquidFilter"
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
            <animate
              attributeName="baseFrequency"
              values="0.005 0.005; 0.008 0.01; 0.005 0.005"
              dur="10s"
              repeatCount="indefinite"
            />
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
          style={{ filter: 'url(#liquidFilter)' }}
        >
          {text}
        </h1>

        {/* Very subtle glow layer instead of aggressive ghost */}
        <h1
          className={`${fontSize} font-black uppercase tracking-[-0.03em] font-syne text-primary/10 absolute inset-0 -z-10 blur-xl pointer-events-none opacity-20 leading-[0.95] text-center translate-y-1`}
          style={{ filter: 'url(#liquidFilter)' }}
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
export const AggressiveGlitchText = ({
  text,
  className = '',
}: {
  text: string
  className?: string
}) => {
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchText, setGlitchText] = useState(text)

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      const rand = Math.random()
      if (rand > 0.85) {
        setIsGlitching(true)
        // Scramble some chars more aggressively
        if (rand > 0.95) {
          setGlitchText(prev =>
            prev
              .split('')
              .map(c => (Math.random() > 0.7 ? '01X_#!$?'[Math.floor(Math.random() * 8)] : c))
              .join('')
          )
        }

        setTimeout(
          () => {
            setIsGlitching(false)
            setGlitchText(text)
          },
          100 + Math.random() * 200
        )
      }
    }, 1500)

    return () => clearInterval(glitchInterval)
  }, [text])

  return (
    <div
      className={`relative inline-block ${className} font-mono font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]`}
    >
      <span
        className="relative z-10 transition-transform duration-75"
        style={{
          transform: isGlitching
            ? `translate(${(Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 2}px)`
            : 'none',
        }}
      >
        {glitchText}
      </span>

      {isGlitching && (
        <>
          <span className="absolute top-0 left-0 -ml-[2px] sm:-ml-[4px] text-red-500 opacity-80 z-0 animate-pulse mix-blend-screen blur-[0.5px] sm:blur-[1px] w-full h-full">
            {glitchText}
          </span>
          <span className="absolute top-0 left-0 ml-[2px] sm:ml-[4px] text-cyan-400 opacity-80 z-0 animate-pulse mix-blend-screen blur-[0.5px] sm:blur-[1px] w-full h-full">
            {glitchText}
          </span>
        </>
      )}
    </div>
  )
}
