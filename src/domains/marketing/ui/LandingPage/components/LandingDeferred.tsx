'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { ApiIntegrationTab, type SelectedFeature } from '../types'
import {
  MARKETING_NEAR_FOLD_SCROLL_Y,
  MarketingDomScrollEvent,
} from '@/domains/marketing/constants/viewport-3d'

const SystemsSection = dynamic(
  () => import('./SystemsSection').then(m => ({ default: m.SystemsSection })),
  { ssr: false, loading: () => <div className="min-h-[40vh]" /> }
)

const ArchitectingRealitySection = dynamic(
  () =>
    import('./ArchitectingRealitySection').then(m => ({
      default: m.ArchitectingRealitySection,
    })),
  { ssr: false, loading: () => <div className="min-h-[30vh]" /> }
)

const ToolsIntegration = dynamic(
  () => import('../../ToolsIntegration').then(m => ({ default: m.ToolsIntegration })),
  { ssr: false, loading: () => <div className="min-h-[50vh]" /> }
)

const ProPlanPromo = dynamic(
  () => import('../../ProPlanPromo').then(m => ({ default: m.ProPlanPromo })),
  { ssr: false, loading: () => <div className="min-h-[40vh]" /> }
)

const ManifestoSection = dynamic(
  () => import('./ManifestoSection').then(m => ({ default: m.ManifestoSection })),
  { ssr: false, loading: () => <div className="min-h-[30vh]" /> }
)

const LandingFooter = dynamic(
  () => import('./LandingFooter').then(m => ({ default: m.LandingFooter })),
  { ssr: false, loading: () => <div className="min-h-[40vh]" /> }
)

const FeatureLightbox = dynamic(
  () => import('./FeatureLightbox').then(m => ({ default: m.FeatureLightbox })),
  { ssr: false }
)

const TurbulentBackground = dynamic(
  () => import('../../TurbulentBackground').then(m => ({ default: m.TurbulentBackground })),
  { ssr: false }
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

/** Below-fold marketing sections + WebGL — mounts after first scroll. */
export function LandingDeferred() {
  const showBelowFold = useScrolledPastFold()
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null)
  const [activeTab, setActiveTab] = useState<ApiIntegrationTab>(ApiIntegrationTab.Rest)

  return (
    <>
      {showBelowFold ? (
        <TurbulentBackground
          showCanvas
          zoom={0.05}
          rotation={3.5}
          speed={0.3}
          morphSpeed={0.15}
          saturation={0.2}
          brightness={1.1}
          contrast={1.4}
          hue={0.9}
        />
      ) : null}

      {selectedFeature ? (
        <FeatureLightbox selectedFeature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      ) : null}

      {showBelowFold ? (
        <>
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
        </>
      ) : (
        <div className="min-h-[120vh]" aria-hidden />
      )}
    </>
  )
}
