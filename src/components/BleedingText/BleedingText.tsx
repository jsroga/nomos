'use client'

import { useRef, useCallback, useEffect } from 'react'

import {
  BLEEDING_CANVAS_CONTEXT,
  BLEEDING_CHARS,
  BLEEDING_DEFAULT_PARTICLE_COLOR,
  BLEEDING_DEFAULT_TEXT_COLOR,
} from './constants/bleeding-text-defaults'

interface Particle {
  x: number
  y: number
  char: string
  vx: number
  vy: number
  opacity: number
  scale: number
}

const VELOCITY_THRESHOLD = 2
const MAX_PARTICLES = 80
// Extra canvas space so particles can travel outside container bounds
const CANVAS_MARGIN = 150

interface BleedingTextProps {
  text: string
  className?: string
  textColor?: string
  // CSS color string, e.g. '#ef4444' or 'rgb(239,68,68)'
  particleColor?: string
}

export function BleedingText({
  text,
  className = '',
  textColor = BLEEDING_DEFAULT_TEXT_COLOR,
  particleColor = BLEEDING_DEFAULT_PARTICLE_COLOR,
}: BleedingTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef({ x: 0, y: 0, time: Date.now() })
  const particlesRef = useRef<Particle[]>([])
  const isHovering = useRef(false)
  const rafRef = useRef<number | null>(null)
  // Keep a mutable ref so the raf loop always reads the latest color without restarting
  const particleColorRef = useRef(particleColor)

  useEffect(() => {
    particleColorRef.current = particleColor
  }, [particleColor])

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return

    function tick() {
      const canvas = canvasRef.current
      if (!canvas) {
        rafRef.current = null
        return
      }
      const ctx = canvas.getContext(BLEEDING_CANVAS_CONTEXT)
      if (!ctx) {
        rafRef.current = null
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update physics in a single pass — avoid array spread by mutating fields
      const ps = particlesRef.current
      const next: Particle[] = []
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const newOpacity = p.opacity - 0.02
        if (newOpacity <= 0) continue
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15 // gravity
        p.vx *= 0.98 // friction
        p.opacity = newOpacity
        next.push(p)
      }
      particlesRef.current = next

      // Draw all particles — set shared properties once outside the loop
      const color = particleColorRef.current
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 10

      for (const p of next) {
        ctx.globalAlpha = p.opacity
        ctx.font = `${Math.round(14 * p.scale)}px monospace`
        ctx.fillText(p.char, p.x + CANVAS_MARGIN, p.y + CANVAS_MARGIN)
      }

      if (next.length > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const spawnParticles = useCallback(
    (x: number, y: number, count: number = 5, burst: boolean = false) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = burst ? 3 + Math.random() * 4 : 1 + Math.random() * 2

        particlesRef.current.push({
          x,
          y,
          char: BLEEDING_CHARS[Math.floor(Math.random() * BLEEDING_CHARS.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (burst ? 0 : 1),
          opacity: 0.9 + Math.random() * 0.1,
          scale: 0.5 + Math.random() * 0.8,
        })
      }

      if (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.splice(0, particlesRef.current.length - MAX_PARTICLES)
      }

      startLoop()
    },
    [startLoop]
  )

  // Size canvas to container + overflow margin; clean up on unmount
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function resize() {
      if (!container || !canvas) return
      canvas.width = container.offsetWidth + CANVAS_MARGIN * 2
      canvas.height = container.offsetHeight + CANVAS_MARGIN * 2
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

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
          spawnParticles(x, y, Math.min(Math.ceil(velocity / 5), 8), false)
        }
      }

      lastPos.current = { x, y, time: now }
    },
    [spawnParticles]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      spawnParticles(e.clientX - rect.left, e.clientY - rect.top, 15, true)
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
        spawnParticles(lastPos.current.x, lastPos.current.y, 3, false)
      }
    },
    [spawnParticles]
  )

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
  }, [])

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
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: -CANVAS_MARGIN,
          left: -CANVAS_MARGIN,
          zIndex: 20,
        }}
      />
    </span>
  )
}
