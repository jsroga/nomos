import React, { useEffect, useState } from 'react'
import { Palette, Loader2 } from 'lucide-react'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { fetchLegnextServerConfigured } from '@/domains/storyteller/core/io/moodboard.api'
import { useBible } from './BibleContext'
import { MoodboardAddTile, MoodboardImageTile } from './MoodboardImageTile'
import { MoodboardEmptyState, MoodboardProgressBar } from './MoodboardEmptyState'
import {
  BibleOverviewConfirm,
  BibleOverviewMoodboardCopy,
} from '../constants/bible-overview'
import { deriveMoodboardGeneratingState } from '../utils/bible-overview-moodboard'

interface MoodboardImagesSectionProps {
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
}

export const MoodboardImagesSection: React.FC<MoodboardImagesSectionProps> = ({
  primaryImageIndex,
  onSetPrimaryImage,
  onRefetchMoodboardData,
}) => {
  const { storyPlan, localPlan, isReadOnly, projectId, getProviderConfig } = useBible()
  const operations = useGlobalStatusStore(state => state.operations)
  const displayMoodImages = (localPlan.moodImages || storyPlan.moodImages || []).filter(
    (img): img is string => typeof img === 'string'
  )
  const moodboardState = deriveMoodboardGeneratingState(
    operations,
    projectId,
    displayMoodImages.length
  )
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const [legnextFromServer, setLegnextFromServer] = useState(false)

  useEffect(() => {
    fetchLegnextServerConfigured()
      .then(configured => {
        if (configured) {
          setLegnextFromServer(true)
        }
      })
      .catch(() => {})
  }, [])

  const confirmDelete = () =>
    confirm({
      title: BibleOverviewConfirm.DeleteImageTitle,
      description: BibleOverviewConfirm.DeleteImageDescription,
      confirmLabel: BibleOverviewConfirm.DeleteLabel,
      variant: BibleOverviewConfirm.DestructiveVariant,
    })

  const hasWorldDescription = Boolean(localPlan.worldDescription || storyPlan.worldDescription)
  const providerConfig = getProviderConfig()

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-400/80" />
          <h3 className="font-syne font-bold text-lg">Moodboard</h3>
        </div>
        {!isReadOnly && moodboardState.isGenerating ? (
          <div className="flex items-center gap-2 text-sm text-pink-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{moodboardState.progressDetails || BibleOverviewMoodboardCopy.ProcessingVisuals}</span>
          </div>
        ) : null}
      </div>
      {!isReadOnly && moodboardState.isGenerating ? (
        <MoodboardProgressBar progressPercent={moodboardState.progressPercent} />
      ) : null}

      {displayMoodImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {displayMoodImages.map((img, index) => (
            <MoodboardImageTile
              key={index}
              imagePath={img}
              index={index}
              projectId={projectId}
              isPrimary={primaryImageIndex === index}
              isLoading={moodboardState.generatingIndices.has(index)}
              isReadOnly={isReadOnly}
              isGenerating={moodboardState.isGenerating}
              progressPercent={moodboardState.progressPercent}
              legnextFromServer={legnextFromServer}
              displayMoodImages={displayMoodImages}
              providerConfig={providerConfig}
              onSetPrimaryImage={onSetPrimaryImage}
              onRefetchMoodboardData={onRefetchMoodboardData}
              confirmDelete={confirmDelete}
            />
          ))}
          <MoodboardAddTile
            isReadOnly={isReadOnly}
            isGenerating={moodboardState.isGenerating}
            isAddingNew={moodboardState.isAddingNew}
            progressPercent={moodboardState.progressPercent}
            projectId={projectId}
            legnextFromServer={legnextFromServer}
            nextIndex={displayMoodImages.length}
            providerConfig={providerConfig}
            onRefetchMoodboardData={onRefetchMoodboardData}
          />
        </div>
      ) : (
        <MoodboardEmptyState
          isReadOnly={isReadOnly}
          isGenerating={moodboardState.isGenerating}
          isAddingNew={moodboardState.isAddingNew}
          progressPercent={moodboardState.progressPercent}
          projectId={projectId}
          legnextFromServer={legnextFromServer}
          hasWorldDescription={hasWorldDescription}
          getProviderConfig={getProviderConfig}
          onRefetchMoodboardData={onRefetchMoodboardData}
        />
      )}
      {ConfirmDialogComponent}
    </section>
  )
}
