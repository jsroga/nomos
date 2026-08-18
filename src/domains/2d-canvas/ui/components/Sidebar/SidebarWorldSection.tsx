import React from 'react'
import { Images, Scroll } from 'lucide-react'
import { MasterPromptField, MasterPromptSuggestMode } from '@/components/MasterPromptField'
import { FileUploader } from '@/components/FileUploader'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import { GENERATION_MODES } from '@/domains/2d-canvas/constants/generation-modes'
import {
  STYLE_REF_FILE_ACCEPT,
  STYLE_REFERENCE_URL_MAX,
  confirmGenerationModeSwitch,
} from '@/domains/2d-canvas/constants/mj-sref'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import {
  WorldGenSidebarWorldCopy,
  WorldGenSidebarToast,
  STYLE_REF_UNDO_TOAST_MS,
  styleRefCaption,
  styleRefCountLabel,
  styleRefUploadingLabel,
  switchGenerationModeDescription,
  WorldGenStyleRefsClass,
} from '../../constants/sidebar'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { HtmlElementType } from '@/shared/data/constants/protocol'

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

  const onRemoveStyleRef = (id: string) => {
    const index = Number(id)
    if (!Number.isInteger(index)) return
    const snapshot = [...styleReferenceUrls]
    handleRemoveStyleRef(index)
    toast(
      toastId => (
        <span className="flex items-center gap-3">
          <span>{WorldGenSidebarToast.ReferenceRemoved}</span>
          <button
            type={HtmlElementType.Button}
            className="font-mono text-xs text-primary"
            onClick={() => {
              handleRestoreStyleRefs(snapshot)
              toast.dismiss(toastId.id)
            }}
          >
            {WorldGenSidebarToast.Undo}
          </button>
        </span>
      ),
      { duration: STYLE_REF_UNDO_TOAST_MS },
    )
  }

  const items = [
    ...styleReferenceUrls.map((src, index) => ({
      id: String(index),
      src,
      caption: styleRefCaption(index),
    })),
    ...(isUploadingStyleRefs
      ? [{ id: WorldGenSidebarWorldCopy.SrefCaption, uploading: true as const }]
      : []),
  ]
  const uploadingCount = isUploadingStyleRefs ? 1 : 0
  const isEmpty = styleReferenceUrls.length === 0 && !isUploadingStyleRefs

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
      <div>
        <div className={WorldGenStyleRefsClass.Header}>
          <span className={WorldGenStyleRefsClass.Label}>
            <Images size={12} strokeWidth={1.7} />
            {WorldGenSidebarWorldCopy.StyleImagesLabel}
          </span>
          {uploadingCount > 0 ? (
            <span className={WorldGenStyleRefsClass.Uploading}>{styleRefUploadingLabel(uploadingCount)}</span>
          ) : styleReferenceUrls.length > 0 ? (
            <span className={WorldGenStyleRefsClass.Count}>
              {styleRefCountLabel(styleReferenceUrls.length, STYLE_REFERENCE_URL_MAX)}
            </span>
          ) : null}
        </div>
        {isEmpty ? (
          <p className={WorldGenStyleRefsClass.Hint}>
            {WorldGenSidebarWorldCopy.StyleImagesHintBefore}
            <span className={WorldGenStyleRefsClass.HintFlag}>{WorldGenSidebarWorldCopy.SrefFlag}</span>
            {WorldGenSidebarWorldCopy.StyleImagesHintAfter}
          </p>
        ) : null}
        <FileUploader
          items={items}
          onPick={files => {
            void handleAddStyleRefFiles(files)
          }}
          onRemove={onRemoveStyleRef}
          accept={STYLE_REF_FILE_ACCEPT}
          maxCount={STYLE_REFERENCE_URL_MAX}
          emptyTitle={WorldGenSidebarWorldCopy.StyleImagesDrop}
          emptyAction={WorldGenSidebarWorldCopy.StyleImagesChoose}
          emptyMeta={isEmpty ? styleRefCountLabel(0, STYLE_REFERENCE_URL_MAX) : undefined}
          addDisabled={isUploadingStyleRefs}
        />
        {isApplyingGenerationMode ? (
          <p className={WorldGenStyleRefsClass.Generating}>{WorldGenSidebarWorldCopy.PromptGenerating}</p>
        ) : null}
      </div>
      {ConfirmDialogComponent}
    </div>
  )
}
