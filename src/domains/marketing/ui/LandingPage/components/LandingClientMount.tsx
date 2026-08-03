'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MARKETING_NEAR_FOLD_SCROLL_Y,
  MarketingDomScrollEvent,
  MarketingIdleDeferMs,
} from '@/domains/marketing/constants/viewport-3d'
import { LandingHeroDomId } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingDeferred } from './LandingDeferred'

const TerrainFloor = dynamic(
  () =>
    import('@/domains/marketing/ui/terrain-floor/TerrainFloor').then(m => ({
      default: m.TerrainFloor,
    })),
  { ssr: false },
)

function useHeroTerrainReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const enable = () => {
      if (!cancelled) setReady(true)
    }

    const onScroll = () => {
      if (window.scrollY >= MARKETING_NEAR_FOLD_SCROLL_Y) enable()
    }
    window.addEventListener(MarketingDomScrollEvent.Scroll, onScroll, { passive: true })
    onScroll()

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: MarketingIdleDeferMs.HeroTerrain })
    } else {
      timeoutId = setTimeout(enable, MarketingIdleDeferMs.HeroTerrain)
    }

    return () => {
      cancelled = true
      window.removeEventListener(MarketingDomScrollEvent.Scroll, onScroll)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [])

  return ready
}

/** Client interactivity for below-fold + deferred hero FX (Three stays off the LCP path). */
export function LandingClientMount() {
  const terrainReady = useHeroTerrainReady()
  const [terrainSlot, setTerrainSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTerrainSlot(document.getElementById(LandingHeroDomId.TerrainSlot))
  }, [])

  return (
    <>
      {terrainReady && terrainSlot ? createPortal(<TerrainFloor />, terrainSlot) : null}
      <LandingDeferred />
    </>
  )
}
