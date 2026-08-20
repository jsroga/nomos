import React, { useState } from 'react'
import { Palette } from 'lucide-react'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import { ImageLightbox } from '@/components/ImageLightbox'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { useBible } from './BibleContext'
import { BibleSectionHeader } from './BibleSectionChrome'
import { MoodboardAddTile, MoodboardImageTile } from './MoodboardImageTile'
import { MoodboardEmptyState, MoodboardProgressBar } from './MoodboardEmptyState'
import {
  BibleOverviewConfirm,
  BibleOverviewMoodboardCopy,
  BibleOverviewSectionTitle,
} from '../constants/bible-overview'
import {
  collectMoodboardImages,
  deriveMoodboardGeneratingState,
  moodboardImageAlt,
  resolveMoodboardImageUrl,
  type MoodboardGeneratingState,
} from '../utils/bible-overview-moodboard'
import { resolveOverviewDisplayFields, isOverviewReadyForMoodboard } from '../utils/bible-overview-fields'
import { generateInitialMoodboard } from '../utils/bible-overview-moodboard-actions'
import { formatMoodboardGeneratingCopy } from '@/domains/storyteller/services/constants/moodboard-generation-service'

interface MoodboardImagesSectionProps {
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
}

interface MoodboardLightboxProps {
  images: string[]
  expandedIndex: number | null
  projectId: string
  onExpandedIndexChange: (index: number | null) => void
}

function MoodboardLightbox({
  images,
  expandedIndex,
  projectId,
  onExpandedIndexChange,
}: MoodboardLightboxProps) {
  const lastIndex = images.length - 1
  const isOpen = expandedIndex !== null && expandedIndex <= lastIndex
  const currentPath = isOpen ? (images[expandedIndex] ?? '') : ''
  return (
    <ImageLightbox
      isOpen={isOpen}
      onClose={() => onExpandedIndexChange(null)}
      imageSrc={isOpen ? (resolveMoodboardImageUrl(currentPath, projectId) ?? '') : ''}
      imageAlt={isOpen ? moodboardImageAlt(expandedIndex) : undefined}
      onNext={() => {
        if (expandedIndex !== null && expandedIndex < lastIndex) {
          onExpandedIndexChange(expandedIndex + 1)
        }
      }}
      onPrev={() => {
        if (expandedIndex !== null && expandedIndex > 0) {
          onExpandedIndexChange(expandedIndex - 1)
        }
      }}
      hasNext={isOpen && expandedIndex < lastIndex}
      hasPrev={isOpen && expandedIndex > 0}
    />
  )
}

interface MoodboardImageGridProps {
  images: string[]
  projectId: string
  primaryImageIndex: number | null
  isReadOnly: boolean
  moodboardState: MoodboardGeneratingState
  providerConfig: Record<string, unknown>
  hasOverviewContext: boolean
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
  confirmDelete: () => Promise<boolean>
  onExpand: (index: number) => void
}

function MoodboardImageGrid({
  images,
  projectId,
  primaryImageIndex,
  isReadOnly,
  moodboardState,
  providerConfig,
  hasOverviewContext,
  onSetPrimaryImage,
  onRefetchMoodboardData,
  confirmDelete,
  onExpand,
}: MoodboardImageGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {images.map((img, index) => (
        <MoodboardImageTile
          key={index}
          imagePath={img}
          index={index}
          projectId={projectId}
          isPrimary={primaryImageIndex === index}
          isLoading={moodboardState.generatingIndices.has(index)}
          isReadOnly={isReadOnly}
          isGenerating={moodboardState.isGenerating}
          isFullBoardGenerating={moodboardState.isFullBoardGenerating}
          progressPercent={moodboardState.progressPercent}
          displayMoodImages={images}
          providerConfig={providerConfig}
          hasOverviewContext={hasOverviewContext}
          onSetPrimaryImage={onSetPrimaryImage}
          onRefetchMoodboardData={onRefetchMoodboardData}
          confirmDelete={confirmDelete}
          onExpand={onExpand}
        />
      ))}
      <MoodboardAddTile
        isReadOnly={isReadOnly}
        isFullBoardGenerating={moodboardState.isFullBoardGenerating}
        isAddingNew={moodboardState.isAddingNew}
        progressPercent={moodboardState.progressPercent}
        projectId={projectId}
        nextIndex={images.length}
        providerConfig={providerConfig}
        hasOverviewContext={hasOverviewContext}
        onRefetchMoodboardData={onRefetchMoodboardData}
      />
    </div>
  )
}

export const MoodboardImagesSection: React.FC<MoodboardImagesSectionProps> = ({
  primaryImageIndex,
  onSetPrimaryImage,
  onRefetchMoodboardData,
}) => {
  const { storyPlan, localPlan, isReadOnly, isEditing, projectId, getProviderConfig } = useBible()
  const operations = useGlobalStatusStore(state => state.operations)
  const displayMoodImages = collectMoodboardImages(
    localPlan.moodImages,
    storyPlan.moodImages,
    !isEditing,
  )
  const moodboardState = deriveMoodboardGeneratingState(
    operations,
    projectId,
    displayMoodImages.length,
  )
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const hasOverviewContext = isOverviewReadyForMoodboard(
    resolveOverviewDisplayFields(storyPlan, localPlan),
  )
  const providerConfig = getProviderConfig()

  const confirmDelete = () =>
    confirm({
      title: BibleOverviewConfirm.DeleteImageTitle,
      description: BibleOverviewConfirm.DeleteImageDescription,
      confirmLabel: BibleOverviewConfirm.DeleteLabel,
      variant: ConfirmDialogVariant.Destructive,
    })

  const handleRefreshMoodboard = () => {
    void generateInitialMoodboard({
      projectId,
      isGenerating: moodboardState.isGenerating,
      hasOverviewContext,
      config: providerConfig,
      onRefetchMoodboardData,
    })
  }

  return (
    <section>
      <BibleSectionHeader
        icon={<Palette className="w-5 h-5 text-pink-400/80" />}
        title={BibleOverviewSectionTitle.Moodboard}
        isReadOnly={isReadOnly}
        isLoading={moodboardState.isGenerating}
        onGenerate={handleRefreshMoodboard}
        generateTitle={BibleOverviewMoodboardCopy.RefreshMoodboard}
        trailingActions={
          !isReadOnly && moodboardState.isGenerating ? (
            <span className="text-sm text-muted-foreground font-medium">
              {formatMoodboardGeneratingCopy(moodboardState.progressPercent)}
            </span>
          ) : null
        }
      />
      {!isReadOnly && moodboardState.isGenerating ? (
        <MoodboardProgressBar progressPercent={moodboardState.progressPercent} />
      ) : null}

      {displayMoodImages.length > 0 ? (
        <MoodboardImageGrid
          images={displayMoodImages}
          projectId={projectId}
          primaryImageIndex={primaryImageIndex}
          isReadOnly={isReadOnly}
          moodboardState={moodboardState}
          providerConfig={providerConfig}
          hasOverviewContext={hasOverviewContext}
          onSetPrimaryImage={onSetPrimaryImage}
          onRefetchMoodboardData={onRefetchMoodboardData}
          confirmDelete={confirmDelete}
          onExpand={setExpandedIndex}
        />
      ) : (
        <MoodboardEmptyState
          isReadOnly={isReadOnly}
          isGenerating={moodboardState.isGenerating}
          isAddingNew={moodboardState.isAddingNew}
          progressPercent={moodboardState.progressPercent}
          projectId={projectId}
          hasOverviewContext={hasOverviewContext}
          getProviderConfig={getProviderConfig}
          onRefetchMoodboardData={onRefetchMoodboardData}
        />
      )}
      <MoodboardLightbox
        images={displayMoodImages}
        expandedIndex={expandedIndex}
        projectId={projectId}
        onExpandedIndexChange={setExpandedIndex}
      />
      {ConfirmDialogComponent}
    </section>
  )
}
