import React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import { X, Loader2, Wand2 } from 'lucide-react'
import { ImageVariantSelector } from '../ImageVariantSelector'
import {
  CHARACTER_DIALOG_GENERATE_MISSING,
  CharacterDialogGenerateMissingDisable,
  CharacterDialogMode,
} from './constants/character-creation-dialog'
import { getDialogTitle, getSubmitLabel } from './character-creation-dialog-helpers'
import {
  CharacterCreationDialogProps,
} from './character-creation-dialog-types'
import { CharacterCreationDialogBasicFields } from './CharacterCreationDialogBasicFields'
import { CharacterCreationDialogPsychologyFields } from './CharacterCreationDialogPsychologyFields'
import { CharacterCreationDialogMetricsFields } from './CharacterCreationDialogMetricsFields'
import { useCharacterCreationDialog } from './useCharacterCreationDialog'
import { SectionPendingOverlay } from '@/domains/storyteller/ui/WorldBible'
import {
  BibleSectionLoadingOverlay,
} from '@/domains/storyteller/ui/WorldBible/components/BibleSectionChrome'
import { pendingReviewHostClass } from '@/domains/storyteller/ui/WorldBible/constants/section-pending-overlay'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'

export type { CharacterCreationDialogProps, InitialCharacterData } from './character-creation-dialog-types'

export const CharacterCreationDialog: React.FC<CharacterCreationDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  projectId,
  initialData,
  mode = CharacterDialogMode.Create,
}) => {
  const dialog = useCharacterCreationDialog({
    isOpen,
    onClose,
    onCreate,
    onUpdate,
    projectId,
    initialData,
    mode,
  })

  if (!isOpen) return null

  const { form, activeGenState, activeCharId } = dialog
  const title = getDialogTitle(mode, Boolean(initialData))
  const submitLabel = getSubmitLabel(mode, Boolean(initialData))
  const generateDisabled =
    !dialog.canGenerateMissing ||
    dialog.isGeneratingMissing ||
    Boolean(dialog.pendingAction)
  const generateButton = (
    <Button
      variant="outline"
      onClick={dialog.handleGenerateMissingFields}
      disabled={generateDisabled}
    >
      {dialog.isGeneratingMissing ? (
        <Loader2 className="animate-spin w-4 h-4 mr-2" />
      ) : (
        <Wand2 className="w-4 h-4 mr-2" />
      )}
      {CHARACTER_DIALOG_GENERATE_MISSING}
    </Button>
  )

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-lg flex flex-col max-h-[90vh] mx-4">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold">{title}</h2>
            <Button variant="outline" size="sm" onClick={dialog.handleClose}>
              <X size={16} />
            </Button>
          </div>

          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              pendingReviewHostClass(
                Boolean(dialog.pendingAction),
                dialog.isGeneratingMissing,
              ),
            )}
          >
            {dialog.pendingAction ? (
              <SectionPendingOverlay
                pendingAction={dialog.pendingAction}
                onReview={dialog.pendingAction.onReview}
              />
            ) : null}
            {dialog.isGeneratingMissing && !dialog.pendingAction ? (
              <BibleSectionLoadingOverlay
                message={CharacterDialogGenerateMissingDisable.WaitingForWritersRoom}
              />
            ) : null}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <CharacterCreationDialogBasicFields
              name={form.name}
              setName={form.setName}
              role={form.role}
              setRole={form.setRole}
              gender={form.gender}
              setGender={form.setGender}
              description={form.description}
              setDescription={form.setDescription}
              mbti={form.mbti}
              setMbti={form.setMbti}
              portraitUrl={form.portraitUrl}
              touched={dialog.touched}
              markTouched={dialog.markTouched}
              isGeneratingPortrait={activeGenState.isGenerating}
              gridImageUrl={activeGenState.gridImageUrl}
              onGeneratePortrait={dialog.handleGeneratePortrait}
              onShowVariantPicker={() => dialog.setShowVariantPicker(true)}
              onSetGridImageUrl={url => dialog.updateGenState(activeCharId, { gridImageUrl: url })}
            />

            <CharacterCreationDialogPsychologyFields
              motivation={form.motivation}
              setMotivation={form.setMotivation}
              fatalFlaw={form.fatalFlaw}
              setFatalFlaw={form.setFatalFlaw}
              secrets={form.secrets}
              setSecrets={form.setSecrets}
            />

            <CharacterCreationDialogMetricsFields
              metrics={form.metrics}
              setMetrics={form.setMetrics}
              isGeneratingMetrics={dialog.isGeneratingMetrics}
              hasDescription={Boolean(form.description)}
              onGenerateMetrics={dialog.handleGenerateMetrics}
            />
            </div>

          <div className="p-4 border-t border-border flex justify-between gap-2">
            {dialog.generateDisabledReason ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{generateButton}</span>
                  </TooltipTrigger>
                  <TooltipContent>{dialog.generateDisabledReason}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              generateButton
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={dialog.handleClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={dialog.handleSubmit}
                disabled={
                  dialog.isSaving ||
                  dialog.isGeneratingMissing ||
                  Boolean(dialog.pendingAction)
                }
              >
                {dialog.isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {dialog.showVariantPicker && activeGenState.gridImageUrl && (
        <ImageVariantSelector
          gridImageUrl={activeGenState.gridImageUrl}
          onSelect={(index, croppedDataUrl) => dialog.handleVariantSelect(croppedDataUrl, index)}
          onCancel={() => dialog.setShowVariantPicker(false)}
        />
      )}
    </>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
