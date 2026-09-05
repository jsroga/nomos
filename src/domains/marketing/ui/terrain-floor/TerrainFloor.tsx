'use client'

import { useEffect, useRef, useState } from 'react'
import { MarketingMediaQuery } from '@/domains/marketing/constants/viewport-3d'

/**
 * Cursor-sculpted terrain floor — decorative hero layer. Parent mounts after first
 * paint; reduced-motion users keep the empty CSS poster slot.
 */
export function TerrainFloor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (window.matchMedia(MarketingMediaQuery.PrefersReducedMotion).matches) return
    setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const container = containerRef.current
    let cancelled = false
    let dispose: (() => void) | undefined

    void (async () => {
      const [THREE, mod] = await Promise.all([import('three'), import('./create-terrain-scene')])
      if (cancelled) return
      dispose = mod.createTerrainFloorScene(THREE, container)
    })()

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
