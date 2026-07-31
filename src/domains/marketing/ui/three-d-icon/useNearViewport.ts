'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { MarketingViewportRootMargin } from '@/domains/marketing/constants/viewport-3d'

type UseNearViewportOptions = {
  prefetchMargin?: string
  mountMargin?: string
  leaveMargin?: string
  /** When false, never mount (e.g. SSR / disabled). Default true. */
  enabled?: boolean
}

type NearViewportState = {
  shouldPrefetch: boolean
  shouldMount: boolean
  containerRef: RefObject<HTMLDivElement | null>
}

/**
 * Dual-band IntersectionObserver: prefetch when approaching, mount when near,
 * unmount when far (leave band).
 */
export function useNearViewport({
  prefetchMargin = MarketingViewportRootMargin.Prefetch,
  mountMargin = MarketingViewportRootMargin.Mount,
  leaveMargin = MarketingViewportRootMargin.Leave,
  enabled = true,
}: UseNearViewportOptions = {}): NearViewportState {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [shouldPrefetch, setShouldPrefetch] = useState(false)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const prefetchObs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShouldPrefetch(true)
      },
      { rootMargin: prefetchMargin, threshold: 0 }
    )

    const mountObs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldMount(true)
          setShouldPrefetch(true)
        }
      },
      { rootMargin: mountMargin, threshold: 0 }
    )

    const leaveObs = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) {
          setShouldMount(false)
        }
      },
      { rootMargin: leaveMargin, threshold: 0 }
    )

    prefetchObs.observe(el)
    mountObs.observe(el)
    leaveObs.observe(el)

    return () => {
      prefetchObs.disconnect()
      mountObs.disconnect()
      leaveObs.disconnect()
    }
  }, [enabled, prefetchMargin, mountMargin, leaveMargin])

  return { shouldPrefetch, shouldMount, containerRef }
}
