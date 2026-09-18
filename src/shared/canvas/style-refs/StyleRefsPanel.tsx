'use client'

import { Paintbrush } from 'lucide-react'
import { FileUploader } from '@/components/FileUploader'
import { Button } from '@/components/Button'
import { STYLE_REF_FILE_ACCEPT, STYLE_REFERENCE_URL_MAX } from './style-ref-files'
import type { StyleRefCatalogItem } from './StyleRefCatalog'
import { StyleRefCatalog } from './StyleRefCatalog'
import { StyleRefsClass, StyleRefsCopy } from './constants'
import { styleRefCountLabel } from './style-ref-labels'
import { styleRefUploaderItems, toastStyleRefRemoved } from './style-ref-panel-items'
import { StyleRefsHeader, styleRefsHint } from './StyleRefsHeader'

export function StyleRefsPanel({
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
  canApplyStyleToAll?: boolean
  onApplyStyleToAll?: () => void
}) {
  const enabledCatalogCount = catalogItems.filter(item => item.enabled).length
  const isEmpty = styleReferenceUrls.length === 0 && !isUploadingStyleRefs
  const count = showAdminCatalog ? enabledCatalogCount : styleReferenceUrls.length
  const items = styleRefUploaderItems(styleReferenceUrls, isUploadingStyleRefs)
  const hint = styleRefsHint(showAdminCatalog, isEmpty)

  const onRemoveStyleRef = (id: string) => {
    const index = Number(id)
    if (!Number.isInteger(index)) return
    const snapshot = [...styleReferenceUrls]
    handleRemoveStyleRef(index)
    toastStyleRefRemoved(snapshot, handleRestoreStyleRefs)
  }

  return (
    <div>
      <StyleRefsHeader
        showAdminCatalog={showAdminCatalog}
        uploadingCount={isUploadingStyleRefs ? 1 : 0}
        count={count}
      />
      {hint ? <p className={StyleRefsClass.Hint}>{hint}</p> : null}
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
          emptyTitle={StyleRefsCopy.StyleImagesDrop}
          emptyAction={StyleRefsCopy.StyleImagesChoose}
          emptyMeta={isEmpty ? styleRefCountLabel(0, STYLE_REFERENCE_URL_MAX) : undefined}
          addDisabled={isUploadingStyleRefs}
        />
      )}
      {isApplyingGenerationMode ? (
        <p className={StyleRefsClass.Generating}>{StyleRefsCopy.PromptGenerating}</p>
      ) : null}
      {onApplyStyleToAll ? (
        <Button
          variant="outline"
          size="sm"
          className={StyleRefsClass.ApplyAll}
          disabled={!canApplyStyleToAll}
          onClick={onApplyStyleToAll}
        >
          <Paintbrush size={12} strokeWidth={1.7} />
          {StyleRefsCopy.ApplyStyleToAll}
        </Button>
      ) : null}
    </div>
  )
}
