'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { LandingNav } from './LandingNav'

export function LandingNavClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClientComponentClient()

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(Boolean(session?.user))
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <LandingNav
      isLoggedIn={isLoggedIn}
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpen={() => setMobileMenuOpen(true)}
      onMobileMenuClose={() => setMobileMenuOpen(false)}
    />
  )
}
