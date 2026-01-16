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

const CHARS = ['0', '1', '?']
const VELOCITY_THRESHOLD = 5
const MAX_PARTICLES = 50

export function BleedingText({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const lastPos = useRef({ x: 0, y: 0, time: Date.now() })
  const [particles, setParticles] = useState<Particle[]>([])
  const particleId = useRef(0)
  const isHovering = useRef(false)

  const spawnParticles = useCallback((x: number, y: number, velocity: number) => {
    const count = Math.min(Math.floor(velocity / 15), 5)
    const newParticles: Particle[] = []

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (velocity / 20) * (0.5 + Math.random() * 0.5)
      
      newParticles.push({
        id: particleId.current++,
        x,
        y,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        vx: Math.cos(angle) * speed * 3,
        vy: Math.sin(angle) * speed * 3 + 1, // slight downward bias
        opacity: 0.8 + Math.random() * 0.2,
        scale: 0.6 + Math.random() * 0.6,
      })
    }

    setParticles(prev => {
      const combined = [...prev, ...newParticles]
      // Limit total particles
      if (combined.length > MAX_PARTICLES) {
        return combined.slice(-MAX_PARTICLES)
      }
      return combined
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !isHovering.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const now = Date.now()
    const dt = now - lastPos.current.time

    if (dt > 0) {
      const dx = x - lastPos.current.x
      const dy = y - lastPos.current.y
      const velocity = Math.sqrt(dx * dx + dy * dy) / (dt / 16) // Normalize to ~60fps

      if (velocity > VELOCITY_THRESHOLD) {
        spawnParticles(x, y, velocity)
      }
    }

    lastPos.current = { x, y, time: now }
  }, [spawnParticles])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    isHovering.current = true
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      lastPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        time: Date.now()
      }
    }
  }, [])

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
    >
      <span className="relative z-10 text-red-600">{text}</span>
      
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
              className="absolute font-mono text-red-800 select-none"
              style={{
                left: 0,
                top: 0,
                fontSize: `${0.3 + p.scale * 0.4}em`,
                textShadow: '0 0 10px rgba(220, 38, 38, 0.5)',
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
