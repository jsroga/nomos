import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { StorytellerBibleTab, WorldBiblePanelLazyPlaceholder, WorldBiblePanelLazyRootMargin } from './constants/world-bible-panel'
import {
  BibleOverview,
  BibleSoundtracks,
  BibleInspirations,
  BibleWorldLogic,
  BibleFactions,
  BibleItems,
  BibleEvents,
  BiblePlotTwists,
  BibleRoadmap,
} from '../WorldBible'

const CharacterWeb = lazy(() => import('../CharacterWeb').then(m => ({ default: m.CharacterWeb })))

/** Mount section only when near the viewport — cuts first-paint cost of Content tab. */
function LazyBibleSection({
  children,
  minHeight = WorldBiblePanelLazyPlaceholder.MinHeightPx,
}: {
  children: ReactNode
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return

    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: WorldBiblePanelLazyRootMargin.Prefetch }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : <div className="h-24 rounded-lg bg-muted/10 animate-pulse" />}
    </div>
  )
}

export interface WorldBiblePanelBodyProps {
  activeTab: StorytellerBibleTab
  projectId?: string
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
  focusEntityId: string | null
  onClearFocusEntity: () => void
}

export function WorldBiblePanelBody({
  activeTab,
  projectId,
  primaryImageIndex,
  onSetPrimaryImage,
  onRefetchMoodboardData,
  focusEntityId,
  onClearFocusEntity,
}: WorldBiblePanelBodyProps) {
  if (activeTab === StorytellerBibleTab.Content) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pt-6">
        <div className="space-y-8 pb-20">
          <BibleOverview
            primaryImageIndex={primaryImageIndex}
            onSetPrimaryImage={onSetPrimaryImage}
            onRefetchMoodboardData={onRefetchMoodboardData}
          />

          <LazyBibleSection>
            <BibleSoundtracks />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleInspirations />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleWorldLogic />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleFactions />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleItems />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleEvents />
          </LazyBibleSection>

          <LazyBibleSection>
            <BiblePlotTwists />
          </LazyBibleSection>

          <LazyBibleSection>
            <BibleRoadmap />
          </LazyBibleSection>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden pt-4">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        }
      >
        <CharacterWeb
          projectId={projectId || ''}
          className="h-full"
          focusEntityId={focusEntityId}
          onNodeClick={(nodeId, nodeData) => {
            console.log('Character web node clicked:', nodeId, nodeData?.name)
            onClearFocusEntity()
          }}
        />
      </Suspense>
    </div>
  )
}
