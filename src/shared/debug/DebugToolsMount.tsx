'use client'

import { useEffect, useState, type ComponentType } from 'react'
import {
  CwvHudEnv,
  PerfDebugEnv,
} from '@/shared/debug/utils/perf-debug'
import { NodeEnv } from '@/shared/data/constants/protocol-http'

type DebugTools = {
  WebVitalsReporter: ComponentType
  WebVitalsHud: ComponentType
  PerfDebugTools: ComponentType
}

const isDev = process.env.NODE_ENV === NodeEnv.Development
const showCwvHud =
  isDev && process.env.NEXT_PUBLIC_FF_CWV_HUD === CwvHudEnv.Enabled
const showPerfDebug =
  isDev && process.env.NEXT_PUBLIC_FF_PERF_DEBUG === PerfDebugEnv.Enabled

/** Dev-only CWV / React Scan mounts — never on production landing. */
export function DebugToolsMount() {
  const [tools, setTools] = useState<DebugTools | null>(null)

  useEffect(() => {
    if (!isDev) return
    let cancelled = false
    const load = async () => {
      try {
        const [reporter, hud, perf] = await Promise.all([
          import('./WebVitalsReporter'),
          import('./WebVitalsHud'),
          import('./PerfDebugTools'),
        ])
        if (cancelled) return
        setTools({
          WebVitalsReporter: reporter.WebVitalsReporter,
          WebVitalsHud: hud.WebVitalsHud,
          PerfDebugTools: perf.PerfDebugTools,
        })
      } catch {
        return
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!isDev || !tools) return null

  const { WebVitalsReporter, WebVitalsHud, PerfDebugTools } = tools
  return (
    <>
      <WebVitalsReporter />
      {showCwvHud || showPerfDebug ? <WebVitalsHud /> : null}
      {showPerfDebug ? <PerfDebugTools /> : null}
    </>
  )
}
