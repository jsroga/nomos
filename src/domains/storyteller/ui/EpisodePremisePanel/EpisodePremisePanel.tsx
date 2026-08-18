import React, { useCallback, useState } from 'react'
import { EpisodePremise, StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { ImageVariantSelector } from '../ImageVariantSelector'
import { EpisodePremiseBibleContext } from './components/EpisodePremiseBibleContext'
import { EpisodePremiseEmptyState } from './components/EpisodePremiseEmptyState'
import { EpisodePremiseHeader } from './components/EpisodePremiseHeader'
import { EpisodePremiseHero } from './components/EpisodePremiseHero'
import { OzymandiasSections } from './components/OzymandiasSection'
import { TenPointsPlanSection } from './components/TenPointsPlanSection'
import { EpisodePremisePanelClass } from './constants/episode-premise-panel'
import { EpisodePremiseSectionKey, OZYMANSIAS_SECTIONS } from './constants/ozymandias-sections'
import { useEpisodePremiseLocalState } from './hooks/useEpisodePremiseLocalState'
import { usePosterVariantPicker } from './hooks/usePosterVariantPicker'
import { handleEpisodePosterVariantSelect } from './utils/handle-poster-variant-select'
import { resolveFullPosterUrl } from './utils/resolve-full-poster-url'
import { SectionPendingOverlay } from '../WorldBible/components/SectionPendingOverlay'
import {
  pendingReviewHostClass,
  SectionPendingOverlayClass,
} from '../WorldBible/constants/section-pending-overlay'
import type { PendingAction } from '../WorldBible/utils/bible-context-types'
import { cn } from '@/shared/data/utils'

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

  const onStartEdit = useCallback(() => setIsEditing(true), [])
  const onCancelEdit = useCallback(() => setIsEditing(false), [])
  const onSave = useCallback(() => {
    handleSave(onUpdate)
    setIsEditing(false)
  }, [handleSave, onUpdate])

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

  const scrollHostClass = cn(
    EpisodePremisePanelClass.ScrollBody,
    pendingReviewHostClass(Boolean(pendingAction)) || SectionPendingOverlayClass.HostRelative
  )

  return (
    <div className={EpisodePremisePanelClass.Root}>
      <EpisodePremiseHeader
        isEditing={isEditing}
        isGenerating={isGenerating}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSave}
      />

      {!premise && !isEditing ? (
        <div className={scrollHostClass}>
          {pendingAction ? (
            <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
          ) : null}
          <EpisodePremiseEmptyState
            isGenerating={isGenerating}
            onGenerate={onGenerate}
            episodeTitle={episodeTitle}
            episodePrompt={episodePrompt}
            onSaveEpisodePrompt={onSaveEpisodePrompt}
          />
        </div>
      ) : (
        <>
          <div className={scrollHostClass}>
            {pendingAction ? (
              <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
            ) : null}
            <EpisodePremiseHero
              localPremise={localPremise}
              isEditing={isEditing}
              isGenerating={isGenerating}
              isGeneratingPoster={isGeneratingPoster}
              generatingSection={generatingSection}
              fullPosterUrl={fullPosterUrl}
              posterPrompt={posterPrompt}
              projectId={projectId}
              onGeneratePoster={onGeneratePoster}
              onGenerateSection={onGenerateSection}
              onTitleChange={value => handleChange('title', value)}
              onThematicFocusChange={value => handleChange('thematicFocus', value)}
              onLoglineChange={value => handleChange('logline', value)}
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
        </>
      )}

      {showVariantPicker && gridImageUrl && (
        <ImageVariantSelector gridImageUrl={gridImageUrl} onSelect={onVariantSelect} />
      )}
    </div>
  )
}
