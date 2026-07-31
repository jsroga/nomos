/** Core Web Vitals reporter wire constants. */

export enum WebVitalMetricName {
  Cls = 'CLS',
  Fcp = 'FCP',
  Inp = 'INP',
  Lcp = 'LCP',
  Ttfb = 'TTFB',
}

export enum WebVitalsLogPrefix {
  Metric = '[web-vitals]',
}

/** Soft “good” thresholds (Chrome UX / web.dev guidance). */
export const WEB_VITAL_GOOD_THRESHOLD = {
  [WebVitalMetricName.Lcp]: 2500,
  [WebVitalMetricName.Inp]: 200,
  [WebVitalMetricName.Cls]: 0.1,
  [WebVitalMetricName.Fcp]: 1800,
  [WebVitalMetricName.Ttfb]: 800,
} as const

export enum WebVitalsRating {
  Good = 'good',
  NeedsImprovement = 'needs-improvement',
  Poor = 'poor',
}
