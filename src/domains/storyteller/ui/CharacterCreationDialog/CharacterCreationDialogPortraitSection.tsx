import React from 'react'
import { Button } from '@/components/Button'
import { Wand2 } from 'lucide-react'
import { StorytellerImage } from '../StorytellerImage'
import {
  CHARACTER_DIALOG_PORTRAIT_DATA_URL_PREFIX,
  CHARACTER_DIALOG_PORTRAIT_STATUS_PICK,
  CHARACTER_DIALOG_PORTRAIT_STATUS_POWERED_BY,
  CHARACTER_DIALOG_PORTRAIT_STATUS_SELECTED,
} from './constants/character-creation-dialog'

interface CharacterCreationDialogPortraitSectionProps {
  name: string
  description: string
  portraitUrl: string
  isGeneratingPortrait: boolean
  gridImageUrl: string | null
  onGeneratePortrait: () => void
  onShowVariantPicker: () => void
  onSetGridImageUrl: (url: string) => void
}

function canPickPortraitVariant(portraitUrl: string, gridImageUrl: string | null): boolean {
  const hasGrid = Boolean(gridImageUrl)
  const hasUncroppedPortrait =
    Boolean(portraitUrl) &&
    !/_(v\d|cropped)_/.test(portraitUrl) &&
    !portraitUrl.startsWith(CHARACTER_DIALOG_PORTRAIT_DATA_URL_PREFIX)
  return hasGrid || hasUncroppedPortrait
}

function portraitStatusLabel(portraitUrl: string): string {
  if (portraitUrl && !/_(v\d|cropped)_/.test(portraitUrl)) {
    return CHARACTER_DIALOG_PORTRAIT_STATUS_PICK
  }
  if (portraitUrl) return CHARACTER_DIALOG_PORTRAIT_STATUS_SELECTED
  return CHARACTER_DIALOG_PORTRAIT_STATUS_POWERED_BY
}

export function CharacterCreationDialogPortraitSection({
  name,
  description,
  portraitUrl,
  isGeneratingPortrait,
  gridImageUrl,
  onGeneratePortrait,
  onShowVariantPicker,
  onSetGridImageUrl,
}: CharacterCreationDialogPortraitSectionProps) {
  const showVariantPicker = canPickPortraitVariant(portraitUrl, gridImageUrl)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Portrait</label>
      <div className="w-full">
        <StorytellerImage
          src={portraitUrl}
          alt={name || 'Character Portrait'}
          isLoading={isGeneratingPortrait}
          aspectRatio="aspect-square"
          emptyLabel={description ? 'Ready to Imagine' : 'Describe character first'}
          onGenerate={!name && !description ? undefined : onGeneratePortrait}
          overlay={
            <div className="flex flex-col gap-2 w-full px-2">
              {showVariantPicker && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs backdrop-blur-md bg-primary/60 hover:bg-primary/80 border-primary/40 text-white"
                  onClick={() => {
                    if (!gridImageUrl && portraitUrl) {
                      onSetGridImageUrl(portraitUrl)
                    }
                    onShowVariantPicker()
                  }}
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Pick Variant
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs backdrop-blur-md bg-white/20 hover:bg-white/40 border-white/20 text-white"
                onClick={onGeneratePortrait}
                disabled={isGeneratingPortrait}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Regenerate
              </Button>
            </div>
          }
        />
      </div>
      <div className="text-[10px] text-muted-foreground text-center">
        {portraitStatusLabel(portraitUrl)}
      </div>
    </div>
  )
}
