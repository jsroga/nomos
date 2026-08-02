'use client'

import { useEffect, useRef, useState } from 'react'
import { MarketingMediaQuery } from '@/domains/marketing/constants/viewport-3d'

/**
 * Cursor-sculpted terrain floor — decorative hero layer. Idle-gated so it never
 * touches LCP; reduced-motion users get the static CSS poster instead.
 */
export function TerrainFloor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (window.matchMedia(MarketingMediaQuery.PrefersReducedMotion).matches) return

    const enable = () => setEnabled(true)
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(enable, { timeout: 500 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timeoutId = window.setTimeout(enable, 200)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const container = containerRef.current
    let cancelled = false
    let dispose: (() => void) | undefined

    void Promise.all([import('three'), import('./create-terrain-scene')]).then(
      ([THREE, mod]) => {
        if (cancelled) return
        dispose = mod.createTerrainFloorScene(THREE, container)
      },
    )

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [enabled])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
        enabled ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
