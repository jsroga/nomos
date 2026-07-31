'use client'

import { useState } from 'react'
import { LandingNav } from './LandingNav'

export function LandingNavClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <LandingNav
      isLoggedIn={false}
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpen={() => setMobileMenuOpen(true)}
      onMobileMenuClose={() => setMobileMenuOpen(false)}
    />
  )
}
