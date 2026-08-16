import React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarTextarea } from '@/components/DomainSidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { QuickActionLabel } from '@/shared/chat/core/constants/quick-actions'
import { GENERATION_MODES, type GenerationModeDef } from '@/domains/2d-canvas/constants/generation-modes'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import {
  WorldGenSidebarWorldCopy,
  switchGenerationModeDescription,
} from '../../constants/sidebar'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { confirmGenerationModeSwitch } from '@/domains/2d-canvas/constants/mj-sref'
import { SidebarStyleRefs } from './SidebarStyleRefs'

type SidebarWorldSectionProps = Pick<
  WorldGenSidebarState,
  | 'masterPrompt'
  | 'handleMasterPromptChange'
  | 'handleSelectGenerationMode'
  | 'handleResetStyleAnchor'
  | 'handleAddStyleRefFiles'
  | 'handleRemoveStyleRef'
  | 'handleClearStyleRefs'
  | 'styleReferenceUrls'
  | 'isUploadingStyleRefs'
  | 'generationMode'
  | 'styleAnchorUrl'
>

export const SidebarWorldSection: React.FC<SidebarWorldSectionProps> = ({
  masterPrompt,
  handleMasterPromptChange,
  handleSelectGenerationMode,
  handleResetStyleAnchor,
  handleAddStyleRefFiles,
  handleRemoveStyleRef,
  handleClearStyleRefs,
  styleReferenceUrls,
  isUploadingStyleRefs,
  generationMode,
  styleAnchorUrl,
}) => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const onSelectMode = async (mode: GenerationModeDef) => {
    const approved = await confirmGenerationModeSwitch(
      confirm,
      WorldGenSidebarWorldCopy.SwitchModeTitle,
      switchGenerationModeDescription(mode.name),
    )
    if (!approved) return
    await handleSelectGenerationMode(mode)
  }

  return (
    <SidebarSection title={WorldGenSidebarWorldCopy.Title}>
      <div className="space-y-3" id={TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT}>
        <div className="flex items-center justify-between gap-2">
          <SidebarLabel>{WorldGenSidebarWorldCopy.PromptLabel}</SidebarLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Sparkles size={12} />
                {QuickActionLabel.SuggestIdea}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {GENERATION_MODES.map(mode => (
                <DropdownMenuItem
                  key={mode.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onSelect={() => {
                    void onSelectMode(mode)
                  }}
                  data-selected={mode.id === generationMode}
                >
                  <span className="text-sm font-medium">{mode.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-normal">
                    {mode.hint}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarTextarea
          value={masterPrompt}
          onChange={e => handleMasterPromptChange(e.target.value)}
          placeholder={WorldGenSidebarWorldCopy.Placeholder}
          className="h-32"
        />
        <SidebarStyleRefs
          urls={styleReferenceUrls}
          isUploading={isUploadingStyleRefs}
          onAddFiles={files => {
            void handleAddStyleRefFiles(files)
          }}
          onRemove={handleRemoveStyleRef}
          onClear={handleClearStyleRefs}
        />
        {styleAnchorUrl ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-0 text-xs text-muted-foreground"
            onClick={handleResetStyleAnchor}
          >
            {WorldGenSidebarWorldCopy.ResetStyleAnchor}
          </Button>
        ) : null}
      </div>
      {ConfirmDialogComponent}
    </SidebarSection>
  )
}
