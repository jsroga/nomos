import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { StorytellerBibleTab } from './constants/world-bible-panel'
import {
  BibleOverview,
  BibleSoundtracks,
  BibleInspirations,
  BibleWorldLogic,
  BibleItems,
  BibleEvents,
  BibleFactions,
  BibleRoadmap,
} from '../WorldBible'

const CharacterWeb = lazy(() => import('../CharacterWeb').then(m => ({ default: m.CharacterWeb })))

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

          <BibleSoundtracks />

          <BibleInspirations />

          <BibleWorldLogic />

          <BibleItems />

          <BibleEvents />

          <BibleFactions />

          <BibleRoadmap />
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
