'use client'

import { useEffect } from 'react'
import { NodeEnv } from '@/shared/data/constants/protocol-http'
import {
  WebVitalsLogPrefix,
  WebVitalsRating,
} from '@/shared/debug/constants/web-vitals'

type VitalMetric = {
  name: string
  value: number
  id: string
  rating?: string
  navigationType?: string
}

function reportMetric(metric: VitalMetric): void {
  const rating = metric.rating ?? WebVitalsRating.NeedsImprovement
  console.info(WebVitalsLogPrefix.Metric, metric.name, {
    value: metric.value,
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  })
}

/**
 * Registers Google `web-vitals` listeners (LCP / INP / CLS / FCP / TTFB).
 * Dev-only; `web-vitals` is loaded lazily so production marketing never pays for it.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== NodeEnv.Development) return

    let cancelled = false
    void (async () => {
      const mod = await import('web-vitals')
      if (cancelled) return
      mod.onCLS(reportMetric)
      mod.onINP(reportMetric)
      mod.onLCP(reportMetric)
      mod.onFCP(reportMetric)
      mod.onTTFB(reportMetric)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
