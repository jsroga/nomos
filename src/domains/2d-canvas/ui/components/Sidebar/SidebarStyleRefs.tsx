import toast from 'react-hot-toast'
import { Images, Paintbrush } from 'lucide-react'
import { FileUploader } from '@/components/FileUploader'
import { Button } from '@/components/Button'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  STYLE_REF_FILE_ACCEPT,
  STYLE_REFERENCE_URL_MAX,
} from '@/domains/2d-canvas/utils/mj-sref'
import type { StyleRefCatalogItem } from '@/domains/2d-canvas/utils/style-ref-catalog'
import {
  WorldGenSidebarWorldCopy,
  WorldGenSidebarToast,
  STYLE_REF_UNDO_TOAST_MS,
  styleRefCaption,
  styleRefCountLabel,
  styleRefUploadingLabel,
  WorldGenStyleRefsClass,
} from '../../utils/sidebar'
import { StyleRefCatalog } from './StyleRefCatalog'

export function SidebarStyleRefs({
  showAdminCatalog,
  catalogItems,
  catalogSaving,
  onToggleCatalogSref,
  styleReferenceUrls,
  isUploadingStyleRefs,
  isApplyingGenerationMode,
  handleAddStyleRefFiles,
  handleRemoveStyleRef,
  handleRestoreStyleRefs,
  canApplyStyleToAll,
  onApplyStyleToAll,
}: {
  showAdminCatalog: boolean
  catalogItems: readonly StyleRefCatalogItem[]
  catalogSaving: boolean
  onToggleCatalogSref: (id: string) => void
  styleReferenceUrls: string[]
  isUploadingStyleRefs: boolean
  isApplyingGenerationMode: boolean
  handleAddStyleRefFiles: (files: Iterable<File>) => void
  handleRemoveStyleRef: (index: number) => void
  handleRestoreStyleRefs: (urls: string[]) => void
  canApplyStyleToAll: boolean
  onApplyStyleToAll: () => void
}) {
  const enabledCatalogCount = catalogItems.filter(item => item.enabled).length
  const uploadingCount = isUploadingStyleRefs ? 1 : 0
  const isEmpty = styleReferenceUrls.length === 0 && !isUploadingStyleRefs
  const count = showAdminCatalog ? enabledCatalogCount : styleReferenceUrls.length
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

  return (
    <div>
      <div className={WorldGenStyleRefsClass.Header}>
        <span className={WorldGenStyleRefsClass.Label}>
          <Images size={12} strokeWidth={1.7} />
          {WorldGenSidebarWorldCopy.StyleImagesLabel}
        </span>
        {uploadingCount > 0 && !showAdminCatalog ? (
          <span className={WorldGenStyleRefsClass.Uploading}>{styleRefUploadingLabel(uploadingCount)}</span>
        ) : count > 0 || showAdminCatalog ? (
          <span className={WorldGenStyleRefsClass.Count}>
            {styleRefCountLabel(count, STYLE_REFERENCE_URL_MAX)}
          </span>
        ) : null}
      </div>
      {showAdminCatalog ? (
        <p className={WorldGenStyleRefsClass.Hint}>{WorldGenSidebarWorldCopy.StyleImagesAdminHint}</p>
      ) : isEmpty ? (
        <p className={WorldGenStyleRefsClass.Hint}>{WorldGenSidebarWorldCopy.StyleImagesHint}</p>
      ) : null}
      {showAdminCatalog ? (
        <StyleRefCatalog
          items={catalogItems}
          disabled={catalogSaving || isApplyingGenerationMode}
          onToggle={onToggleCatalogSref}
        />
      ) : (
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
      )}
      {isApplyingGenerationMode ? (
        <p className={WorldGenStyleRefsClass.Generating}>{WorldGenSidebarWorldCopy.PromptGenerating}</p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className={WorldGenStyleRefsClass.ApplyAll}
        disabled={!canApplyStyleToAll}
        onClick={onApplyStyleToAll}
      >
        <Paintbrush size={12} strokeWidth={1.7} />
        {WorldGenSidebarWorldCopy.ApplyStyleToAll}
      </Button>
    </div>
  )
}
