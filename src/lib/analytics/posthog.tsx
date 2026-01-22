'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// Initialize PostHog
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false, // We'll handle this manually for SPA
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: true,
      // Disable in development if needed
      loaded: posthog => {
        if (process.env.NODE_ENV === 'development') {
          // Optionally disable in dev: posthog.opt_out_capturing()
        }
      },
    })
  } else {
    console.warn('PostHog: NEXT_PUBLIC_POSTHOG_KEY not set, analytics disabled')
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}> {children} </PHProvider>
}

// Page view tracking for SPA
export function PostHogPageView() {
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      })
    }
  }, [])

  return null
}

// Helper to identify users when they log in
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.identify(userId, properties)
  }
}

// Helper to reset identity on logout
export function resetUser() {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.reset()
  }
}

// Track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, properties)
  }
}

// Export the posthog instance for direct access
export { posthog }
