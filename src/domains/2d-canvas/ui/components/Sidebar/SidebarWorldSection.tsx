import React from 'react'
import { Scroll } from 'lucide-react'
import { MasterPromptField, MasterPromptSuggestMode } from '@/components/MasterPromptField'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { GENERATION_MODES } from '@/domains/2d-canvas/utils/generation-modes'
import { hasStyleRefCatalog } from '@/domains/2d-canvas/utils/style-ref-catalog'
import { confirmGenerationModeSwitch } from '@/domains/2d-canvas/utils/mj-sref'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import {
  WorldGenSidebarWorldCopy,
  switchGenerationModeDescription,
} from '../../utils/sidebar'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { SidebarStyleRefs } from './SidebarStyleRefs'

type SidebarWorldSectionProps = Pick<
  WorldGenSidebarState,
  | 'masterPrompt'
  | 'handleMasterPromptChange'
  | 'handleSelectGenerationMode'
  | 'handleAddStyleRefFiles'
  | 'handleRemoveStyleRef'
  | 'handleRestoreStyleRefs'
  | 'styleReferenceUrls'
  | 'isUploadingStyleRefs'
  | 'isApplyingGenerationMode'
  | 'generationMode'
  | 'styleRefCatalogCanEdit'
  | 'styleRefCatalogItems'
  | 'styleRefCatalogSaving'
  | 'onToggleStyleRefCatalog'
>

export const SidebarWorldSection: React.FC<SidebarWorldSectionProps> = ({
  masterPrompt,
  handleMasterPromptChange,
  handleSelectGenerationMode,
  handleAddStyleRefFiles,
  handleRestoreStyleRefs,
  handleRemoveStyleRef,
  styleReferenceUrls,
  isUploadingStyleRefs,
  isApplyingGenerationMode,
  generationMode,
  styleRefCatalogCanEdit,
  styleRefCatalogItems,
  styleRefCatalogSaving,
  onToggleStyleRefCatalog,
}) => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const onSuggestPick = async (id: string) => {
    const mode = GENERATION_MODES.find(entry => entry.id === id)
    if (!mode) return
    const approved = await confirmGenerationModeSwitch(
      confirm,
      WorldGenSidebarWorldCopy.SwitchModeTitle,
      switchGenerationModeDescription(mode.name),
    )
    if (!approved) return
    await handleSelectGenerationMode(mode)
  }

  return (
    <div id={TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT}>
      <MasterPromptField
        label={WorldGenSidebarWorldCopy.PromptLabel}
        icon={<Scroll size={12} strokeWidth={1.7} />}
        value={masterPrompt}
        onChange={handleMasterPromptChange}
        placeholder={WorldGenSidebarWorldCopy.Placeholder}
        suggestMode={MasterPromptSuggestMode.Menu}
        suggestItems={GENERATION_MODES.map(mode => ({
          id: mode.id,
          label: mode.name,
          description: mode.hint,
        }))}
        onSuggestPick={id => {
          void onSuggestPick(id)
        }}
        suggestBusy={isApplyingGenerationMode}
      />
      <SidebarStyleRefs
        showAdminCatalog={styleRefCatalogCanEdit && hasStyleRefCatalog(generationMode)}
        catalogItems={styleRefCatalogItems}
        catalogSaving={styleRefCatalogSaving}
        onToggleCatalogSref={id => {
          void onToggleStyleRefCatalog(id)
        }}
        styleReferenceUrls={styleReferenceUrls}
        isUploadingStyleRefs={isUploadingStyleRefs}
        isApplyingGenerationMode={isApplyingGenerationMode}
        handleAddStyleRefFiles={handleAddStyleRefFiles}
        handleRemoveStyleRef={handleRemoveStyleRef}
        handleRestoreStyleRefs={handleRestoreStyleRefs}
      />
      {ConfirmDialogComponent}
    </div>
  )
}
