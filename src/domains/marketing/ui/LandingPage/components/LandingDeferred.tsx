'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { ApiIntegrationTab, type SelectedFeature } from '../types'
import {
  MARKETING_NEAR_FOLD_SCROLL_Y,
  MarketingDomScrollEvent,
} from '@/domains/marketing/constants/viewport-3d'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import { LandingFooter } from './LandingFooter'
import { FeatureLightbox } from './FeatureLightbox'
import { ManifestoSection } from './ManifestoSection'

/** Canvas / WebGL only — `ssr: false` is allowed for non-text marketing FX. */
const TurbulentBackground = dynamic(
  async () => ({ default: (await import('../../TurbulentBackground')).TurbulentBackground }),
  { ssr: false },
)

const ToolsIntegration = dynamic(async () => ({
  default: (await import('@/domains/marketing/ui/ToolsIntegration')).ToolsIntegration,
}))

const SystemsSection = dynamic(async () => ({
  default: (await import('./SystemsSection')).SystemsSection,
}))

const ProPlanPromo = dynamic(async () => ({
  default: (await import('@/domains/marketing/ui/ProPlanPromo')).ProPlanPromo,
}))

function useScrolledPastFold(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY >= MARKETING_NEAR_FOLD_SCROLL_Y) setReady(true)
    }

    window.addEventListener(MarketingDomScrollEvent.Scroll, onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener(MarketingDomScrollEvent.Scroll, onScroll)
  }, [])

  return ready
}

/** Below-fold client sections — code-split so hero JS stays small. */
export function LandingDeferred() {
  const showWebGl = useScrolledPastFold()
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null)
  const [activeTab, setActiveTab] = useState<ApiIntegrationTab>(ApiIntegrationTab.Rest)

  return (
    <>
      {showWebGl ? (
        <TurbulentBackground showCanvas {...TURBULENT_BG_PROPS} />
      ) : null}

      {selectedFeature ? (
        <FeatureLightbox selectedFeature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      ) : null}

      <div className="relative z-10">
        <ToolsIntegration />
        <SystemsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectFeature={setSelectedFeature}
        />
        <ProPlanPromo />
        <ManifestoSection />
        <LandingFooter />
      </div>
    </>
  )
}
