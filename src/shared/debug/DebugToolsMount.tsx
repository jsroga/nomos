'use client'

import dynamic from 'next/dynamic'
import {
  CwvHudEnv,
  PerfDebugEnv,
} from '@/shared/debug/constants/perf-debug'
import { NodeEnv } from '@/shared/data/constants/protocol-http'

const WebVitalsReporter = dynamic(
  () => import('@/shared/debug').then(m => ({ default: m.WebVitalsReporter })),
  { ssr: false }
)
const WebVitalsHud = dynamic(
  () => import('@/shared/debug').then(m => ({ default: m.WebVitalsHud })),
  { ssr: false }
)
const PerfDebugTools = dynamic(
  () => import('@/shared/debug').then(m => ({ default: m.PerfDebugTools })),
  { ssr: false }
)

const isDev = process.env.NODE_ENV === NodeEnv.Development
const showCwvHud =
  isDev && process.env.NEXT_PUBLIC_FF_CWV_HUD === CwvHudEnv.Enabled
const showPerfDebug =
  isDev && process.env.NEXT_PUBLIC_FF_PERF_DEBUG === PerfDebugEnv.Enabled

/** Dev-only CWV / React Scan mounts — never on production landing. */
export function DebugToolsMount() {
  if (!isDev) return null

  return (
    <>
      <WebVitalsReporter />
      {showCwvHud || showPerfDebug ? <WebVitalsHud /> : null}
      {showPerfDebug ? <PerfDebugTools /> : null}
    </>
  )
}
