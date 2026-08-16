import React, { useState } from 'react'
import { EpisodePremise, StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { ImageVariantSelector } from '../ImageVariantSelector'
import { EpisodePremiseBibleContext } from './components/EpisodePremiseBibleContext'
import { EpisodePremiseEmptyState } from './components/EpisodePremiseEmptyState'
import { EpisodePremiseHero, EpisodePremiseToolbar } from './components/EpisodePremiseHero'
import { OzymandiasSections } from './components/OzymandiasSection'
import { TenPointsPlanSection } from './components/TenPointsPlanSection'
import { EpisodePremiseSectionKey, OZYMANSIAS_SECTIONS } from './constants/ozymandias-sections'
import { useEpisodePremiseLocalState } from './hooks/useEpisodePremiseLocalState'
import { usePosterVariantPicker } from './hooks/usePosterVariantPicker'
import { handleEpisodePosterVariantSelect } from './utils/handle-poster-variant-select'
import { resolveFullPosterUrl } from './utils/resolve-full-poster-url'
import { SectionPendingOverlay } from '../WorldBible/components/SectionPendingOverlay'
import type { PendingAction } from '../WorldBible/utils/bible-context-types'

interface EpisodePremisePanelProps {
  premise: EpisodePremise | null
  globalBible: Partial<StoryPlan>
  posterUrl?: string | null
  posterPrompt?: string | null
  onUpdate: (updates: Partial<EpisodePremise> & { poster?: string }) => void
  onGenerate: () => void
  onGeneratePoster?: () => void
  onGenerateStoryboard?: () => void
  onGenerateSection?: (section: EpisodePremiseSectionKey) => void
  isGenerating?: boolean
  isGeneratingPoster?: boolean
  posterIsVariantGrid?: boolean
  isGeneratingStoryboard?: boolean
  projectId: string
  episodeId?: string
  storyboardUrl?: string | null
  generatingSection?: string | null
  pendingAction?: PendingAction
  episodeTitle?: string
  episodePrompt?: string
  onSaveEpisodePrompt?: (prompt: string) => void
}

export const EpisodePremisePanel: React.FC<EpisodePremisePanelProps> = ({
  premise,
  globalBible,
  posterUrl,
  posterPrompt,
  onUpdate,
  onGenerate,
  onGeneratePoster,
  onGenerateStoryboard: _onGenerateStoryboard,
  onGenerateSection,
  isGenerating = false,
  isGeneratingPoster = false,
  posterIsVariantGrid = false,
  isGeneratingStoryboard: _isGeneratingStoryboard = false,
  projectId,
  episodeId,
  storyboardUrl: _storyboardUrl,
  generatingSection = null,
  pendingAction,
  episodeTitle,
  episodePrompt,
  onSaveEpisodePrompt,
}) => {
  const [showBibleContext, _setShowBibleContext] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { localPremise, setLocalPremise, handleSave, handleChange } = useEpisodePremiseLocalState(
    premise,
    isEditing
  )

  const fullPosterUrl = resolveFullPosterUrl(localPremise.poster, posterUrl, projectId)
  const { showVariantPicker, gridImageUrl, setShowVariantPicker, setGridImageUrl } =
    usePosterVariantPicker(posterUrl, isGeneratingPoster, fullPosterUrl, posterIsVariantGrid)

  if (!premise && !isEditing) {
    return (
      <div className="relative h-full">
        {pendingAction ? (
          <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
        ) : null}
        <div className="h-full overflow-y-auto p-6 md:p-8">
          <EpisodePremiseEmptyState
            isGenerating={isGenerating}
            onGenerate={onGenerate}
            episodeTitle={episodeTitle}
            episodePrompt={episodePrompt}
            onSaveEpisodePrompt={onSaveEpisodePrompt}
          />
        </div>
      </div>
    )
  }

  const onSave = () => {
    handleSave(onUpdate)
    setIsEditing(false)
  }

  const onVariantSelect = (variantIndex: number, croppedDataUrl: string) =>
    void handleEpisodePosterVariantSelect({
      variantIndex,
      croppedDataUrl,
      episodeId,
      projectId,
      localPremise,
      setLocalPremise,
      setShowVariantPicker,
      setGridImageUrl,
      onUpdate,
    })

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 relative">
          {pendingAction ? (
            <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
          ) : null}
          <EpisodePremiseToolbar
            isEditing={isEditing}
            isGenerating={isGenerating}
            generatingSection={generatingSection}
            hasLogline={Boolean(localPremise.logline)}
            onGenerateSection={onGenerateSection}
            onStartEdit={() => setIsEditing(true)}
            onCancelEdit={() => setIsEditing(false)}
            onSave={onSave}
          />

          <EpisodePremiseHero
            localPremise={localPremise}
            isEditing={isEditing}
            isGeneratingPoster={isGeneratingPoster}
            generatingSection={generatingSection}
            fullPosterUrl={fullPosterUrl}
            posterPrompt={posterPrompt}
            projectId={projectId}
            onGeneratePoster={onGeneratePoster}
            onTitleChange={value => handleChange('title', value)}
            onThematicFocusChange={value => handleChange('thematicFocus', value)}
            episodePrompt={episodePrompt}
            onSaveEpisodePrompt={onSaveEpisodePrompt}
          />

          <OzymandiasSections
            localPremise={localPremise}
            isEditing={isEditing}
            isGenerating={isGenerating}
            generatingSection={generatingSection}
            projectId={projectId}
            onGenerate={onGenerate}
            onGenerateSection={onGenerateSection}
            onFieldChange={(field, value) => handleChange(field, value)}
            sections={OZYMANSIAS_SECTIONS}
          />

          <TenPointsPlanSection
            tenPointsPlan={localPremise.tenPointsPlan}
            isEditing={isEditing}
            isGenerating={isGenerating}
            generatingSection={generatingSection}
            projectId={projectId}
            onGenerateSection={onGenerateSection}
            onChange={plan => handleChange('tenPointsPlan', plan)}
          />
        </div>

        {showBibleContext && globalBible && (
          <EpisodePremiseBibleContext globalBible={globalBible} />
        )}
      </div>

      {showVariantPicker && gridImageUrl && (
        <ImageVariantSelector gridImageUrl={gridImageUrl} onSelect={onVariantSelect} />
      )}
    </>
  )
}
