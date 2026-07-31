'use client'

import { useEffect } from 'react'
import { isPerfDebugEnabled } from '@/shared/debug/constants/perf-debug'

enum ReactScanExport {
  Scan = 'scan',
}

function readScanFn(mod: object): ((opts: { enabled: boolean; showToolbar: boolean }) => void) | null {
  if (!(ReactScanExport.Scan in mod)) return null
  const value: unknown = Reflect.get(mod, ReactScanExport.Scan)
  if (typeof value !== 'function') return null
  return (opts: { enabled: boolean; showToolbar: boolean }) => {
    value(opts)
  }
}

/**
 * Opt-in React Scan (re-render overlay). Enable with `NEXT_PUBLIC_FF_PERF_DEBUG=true`.
 * For live CWV numbers use `WebVitalsHud` (`NEXT_PUBLIC_FF_CWV_HUD=true`).
 *
 * `webpackIgnore` keeps react-scan out of the webpack graph — the package's
 * named `version` re-export breaks Next webpack compiles even when unused.
 */
export function PerfDebugTools() {
  useEffect(() => {
    if (!isPerfDebugEnabled()) return

    let cancelled = false
    void import(/* webpackIgnore: true */ 'react-scan')
      .then(mod => {
        if (cancelled) return
        const scan = readScanFn(mod)
        if (!scan) return
        scan({
          enabled: true,
          showToolbar: true,
        })
      })
      .catch(() => {
        // Optional tooling — never block the app if the package fails to load.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
