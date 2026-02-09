'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Particle {
  id: number
  x: number
  y: number
  char: string
  vx: number
  vy: number
  opacity: number
  scale: number
}

// Strange/glitch characters for bleeding effect
const CHARS = [
  '҉',
  '̈́',
  '̈',
  '̷',
  '̸',
  '̵', // Combining chars
  '▓',
  '░',
  '▒',
  '█',
  '▀',
  '▄', // Block elements
  '†',
  '‡',
  '※',
  '⁂',
  '☠',
  '⚠', // Symbols
  '◬',
  '◭',
  '◮',
  '◯',
  '◰',
  '◱', // Geometric
  'Ξ',
  'Ψ',
  'Ω',
  'λ',
  'Σ',
  'Δ', // Greek
  '卐',
  '卍',
  '☣',
  '☢',
  '⛧',
  '⁘', // Esoteric
  '∞',
  '∅',
  '∴',
  '∵',
  '≈',
  '≠', // Math
  '⌀',
  '⌁',
  '⌂',
  '⌘',
  '⌬',
  '⏚', // Technical
]
const VELOCITY_THRESHOLD = 2 // Lower threshold for easier triggering
const MAX_PARTICLES = 80

interface BleedingTextProps {
  text: string
  className?: string
  textColor?: string
  particleColor?: string
}

export function BleedingText({
  text,
  className = '',
  textColor = 'text-red-500', // Default relative to base size
  particleColor = 'text-red-500',
}: BleedingTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const lastPos = useRef({ x: 0, y: 0, time: Date.now() })
  const [particles, setParticles] = useState<Particle[]>([])
  const particleId = useRef(0)
  const isHovering = useRef(false)

  const spawnParticles = useCallback(
    (x: number, y: number, count: number = 5, burst: boolean = false) => {
      const newParticles: Particle[] = []

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = burst ? 3 + Math.random() * 4 : 1 + Math.random() * 2

        newParticles.push({
          id: particleId.current++,
          x,
          y,
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (burst ? 0 : 1), // gravity bias for non-burst
          opacity: 0.9 + Math.random() * 0.1,
          scale: 0.5 + Math.random() * 0.8,
        })
      }

      setParticles(prev => {
        const combined = [...prev, ...newParticles]
        if (combined.length > MAX_PARTICLES) {
          return combined.slice(-MAX_PARTICLES)
        }
        return combined
      })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !isHovering.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const now = Date.now()
      const dt = now - lastPos.current.time

      if (dt > 0) {
        const dx = x - lastPos.current.x
        const dy = y - lastPos.current.y
        const velocity = Math.sqrt(dx * dx + dy * dy) / (dt / 16)

        if (velocity > VELOCITY_THRESHOLD) {
          const count = Math.min(Math.ceil(velocity / 5), 8)
          spawnParticles(x, y, count, false)
        }
      }

      lastPos.current = { x, y, time: now }
    },
    [spawnParticles]
  )

  // Click spawns a burst of particles
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      spawnParticles(x, y, 15, true) // burst of 15 particles
    },
    [spawnParticles]
  )

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      isHovering.current = true
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        lastPos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          time: Date.now(),
        }
        // Spawn a few particles on enter
        spawnParticles(lastPos.current.x, lastPos.current.y, 3, false)
      }
    },
    [spawnParticles]
  )

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
  }, [])

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
            vx: p.vx * 0.98, // friction
            opacity: p.opacity - 0.02,
          }))
          .filter(p => p.opacity > 0)
      )
    }, 16)

    return () => clearInterval(interval)
  }, [particles.length > 0])

  return (
    <span
      ref={containerRef}
      className={`relative inline-block cursor-crosshair ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <span className={`relative z-10 ${textColor}`}>{text}</span>

      {/* Particles container */}
      <span className="absolute inset-0 overflow-visible pointer-events-none">
        <AnimatePresence>
          {particles.map(p => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: p.opacity,
                scale: p.scale,
                x: p.x,
                y: p.y,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.1 }}
              className={`absolute font-mono select-none ${particleColor}`}
              style={{
                left: 0,
                top: 0,
                fontSize: `${0.3 + p.scale * 0.4}em`,
                textShadow: '0 0 10px currentColor',
              }}
            >
              {p.char}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  )
}
