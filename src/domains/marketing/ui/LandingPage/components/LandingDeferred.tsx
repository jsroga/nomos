'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { ApiIntegrationTab, type SelectedFeature } from '../types'
import {
  MARKETING_NEAR_FOLD_SCROLL_Y,
  MarketingDomScrollEvent,
} from '@/domains/marketing/constants/viewport-3d'
import { ToolsIntegration } from '@/domains/marketing/ui/ToolsIntegration'
import { ProPlanPromo } from '@/domains/marketing/ui/ProPlanPromo'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import { SystemsSection } from './SystemsSection'
import { ManifestoSection } from './ManifestoSection'
import { LandingFooter } from './LandingFooter'
import { FeatureLightbox } from './FeatureLightbox'

const TurbulentBackground = dynamic(
  () => import('../../TurbulentBackground').then(m => ({ default: m.TurbulentBackground })),
  { ssr: false },
)

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

/** Sections are SSR'd in first HTML; WebGL backdrop mounts after a short scroll. */
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
