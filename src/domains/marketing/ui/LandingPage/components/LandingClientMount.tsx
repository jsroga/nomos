'use client'

import dynamic from 'next/dynamic'

const LandingDeferred = dynamic(
  () => import('./LandingDeferred').then(m => ({ default: m.LandingDeferred })),
  { ssr: false }
)

/** Below-fold island only — static nav stays in the server HTML. */
export function LandingClientMount() {
  return <LandingDeferred />
}
