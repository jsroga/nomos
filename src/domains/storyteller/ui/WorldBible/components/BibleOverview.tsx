import React from 'react'
import { WorldDescriptionSection } from './WorldDescriptionSection'
import { MoodboardImagesSection } from './MoodboardImagesSection'

interface BibleOverviewProps {
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
}

export const BibleOverview: React.FC<BibleOverviewProps> = ({
  primaryImageIndex,
  onSetPrimaryImage,
  onRefetchMoodboardData,
}) => {
  return (
    <div className="space-y-8">
      <WorldDescriptionSection />
      <MoodboardImagesSection
        primaryImageIndex={primaryImageIndex}
        onSetPrimaryImage={onSetPrimaryImage}
        onRefetchMoodboardData={onRefetchMoodboardData}
      />
    </div>
  )
}
