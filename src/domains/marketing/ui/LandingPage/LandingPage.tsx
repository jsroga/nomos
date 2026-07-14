'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ProPlanPromo } from '../ProPlanPromo'
import { ToolsIntegration } from '../ToolsIntegration'
import { TurbulentBackground } from '../TurbulentBackground'
import { ArchitectingRealitySection } from './components/ArchitectingRealitySection'
import { FeatureLightbox } from './components/FeatureLightbox'
import { LandingFooter } from './components/LandingFooter'
import { LandingHero } from './components/LandingHero'
import { LandingNav } from './components/LandingNav'
import { ManifestoSection } from './components/ManifestoSection'
import { SystemsSection } from './components/SystemsSection'
import { useLandingScroll } from './hooks/useLandingScroll'
import { ApiIntegrationTab, type SelectedFeature } from './types'

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const { containerRef, heroY, heroOpacity, bgOverlayOpacity } = useLandingScroll()
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null)
  const [activeTab, setActiveTab] = useState<ApiIntegrationTab>(ApiIntegrationTab.Rest)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <TurbulentBackground
      zoom={0.05}
      rotation={3.5}
      speed={0.3}
      morphSpeed={0.15}
      saturation={0.2}
      brightness={1.1}
      contrast={1.4}
      hue={0.9}
    >
      <div
        ref={containerRef}
        className="relative w-full min-h-screen text-white selection:bg-primary/30 overflow-x-hidden"
      >
        <motion.div
          style={{ opacity: bgOverlayOpacity }}
          className="fixed inset-0 bg-black pointer-events-none z-0"
        />

        <FeatureLightbox selectedFeature={selectedFeature} onClose={() => setSelectedFeature(null)} />

        <LandingNav
          isLoggedIn={isLoggedIn}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />

        <LandingHero isLoggedIn={isLoggedIn} heroY={heroY} heroOpacity={heroOpacity} />

        <ToolsIntegration />

        <SystemsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectFeature={setSelectedFeature}
        />

        <ProPlanPromo />

        <ArchitectingRealitySection />

        <ManifestoSection />

        <LandingFooter />
      </div>
    </TurbulentBackground>
  )
}
