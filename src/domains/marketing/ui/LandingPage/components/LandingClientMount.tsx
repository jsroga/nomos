'use client'

import { LandingDeferred } from './LandingDeferred'

/** Client interactivity for below-fold; sections still render in first HTML. */
export function LandingClientMount() {
  return <LandingDeferred />
}
