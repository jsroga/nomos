'use client'

import { useEffect, useState } from 'react'
import {
  CwvAttributionField,
  CwvHudCopy,
  isCwvHudEnabled,
  PerfDebugHudRatingClass,
} from '@/shared/debug/constants/perf-debug'
import {
  WebVitalMetricName,
  WebVitalsRating,
} from '@/shared/debug/constants/web-vitals'

type VitalRow = {
  name: string
  value: number
  rating: string
  detail: string | null
}

function ratingClass(rating: string): string {
  if (rating === WebVitalsRating.Good) return PerfDebugHudRatingClass.Good
  if (rating === WebVitalsRating.Poor) return PerfDebugHudRatingClass.Poor
  return PerfDebugHudRatingClass.NeedsImprovement
}

function formatVitalValue(name: string, value: number): string {
  if (name === WebVitalMetricName.Cls) return value.toFixed(3)
  return `${Math.round(value)}ms`
}

function readStringField(source: object, key: string): string | null {
  if (!(key in source)) return null
  const value = Reflect.get(source, key)
  return typeof value === 'string' && value.length > 0 ? value : null
}

function attributionDetail(metric: object): string | null {
  if (!(CwvAttributionField.Attribution in metric)) return null
  const attr = Reflect.get(metric, CwvAttributionField.Attribution)
  if (!attr || typeof attr !== 'object') return null

  return (
    readStringField(attr, CwvAttributionField.Element) ??
    readStringField(attr, CwvAttributionField.LargestShiftTarget) ??
    readStringField(attr, CwvAttributionField.InteractionTarget) ??
    readStringField(attr, CwvAttributionField.EventTarget) ??
    null
  )
}

/**
 * Live Core Web Vitals overlay. Loads `web-vitals/attribution` only when enabled.
 */
export function WebVitalsHud() {
  const [rows, setRows] = useState<VitalRow[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const enabled = isCwvHudEnabled()

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    void import('web-vitals/attribution').then(mod => {
      if (cancelled) return

      const push = (metric: {
        name: string
        value: number
        rating?: string
      } & object) => {
        setRows(prev => {
          const next = prev.filter(row => row.name !== metric.name)
          next.push({
            name: metric.name,
            value: metric.value,
            rating: metric.rating ?? WebVitalsRating.NeedsImprovement,
            detail: attributionDetail(metric),
          })
          return next.sort((a, b) => a.name.localeCompare(b.name))
        })
      }

      const opts = { reportAllChanges: true }
      mod.onCLS(push, opts)
      mod.onINP(push, opts)
      mod.onLCP(push, opts)
      mod.onFCP(push, opts)
      mod.onTTFB(push, opts)
    })

    return () => {
      cancelled = true
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <aside
      aria-label={CwvHudCopy.Title}
      className="fixed bottom-3 left-3 z-[9999] max-w-sm rounded-md border border-white/20 bg-black/85 font-mono text-[11px] text-white/90 shadow-lg"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-white/55 hover:text-white/80"
        onClick={() => setCollapsed(value => !value)}
      >
        <span>{CwvHudCopy.Title}</span>
        <span className="normal-case tracking-normal text-white/35">
          {collapsed ? CwvHudCopy.Show : CwvHudCopy.Hide}
        </span>
      </button>
      {!collapsed && (
        <div className="border-t border-white/10 px-3 py-2">
          {rows.length === 0 ? (
            <div className="text-white/40">{CwvHudCopy.Waiting}</div>
          ) : (
            <ul className="space-y-1.5">
              {rows.map(row => (
                <li key={row.name}>
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold">{row.name}</span>
                    <span className={ratingClass(row.rating)}>
                      {formatVitalValue(row.name, row.value)}
                    </span>
                  </div>
                  {row.detail ? (
                    <div className="mt-0.5 truncate text-[10px] text-white/45" title={row.detail}>
                      {row.detail}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 text-[9px] text-white/30">{CwvHudCopy.Hint}</div>
        </div>
      )}
    </aside>
  )
}
