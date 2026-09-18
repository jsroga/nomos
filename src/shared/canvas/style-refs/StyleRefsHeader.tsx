import { Images } from 'lucide-react'
import { STYLE_REFERENCE_URL_MAX } from './style-ref-files'
import { StyleRefsClass, StyleRefsCopy } from './constants'
import { styleRefCountLabel, styleRefUploadingLabel } from './style-ref-labels'

export function StyleRefsHeader({
  showAdminCatalog,
  uploadingCount,
  count,
}: {
  showAdminCatalog: boolean
  uploadingCount: number
  count: number
}) {
  const showUploading = uploadingCount > 0 && !showAdminCatalog
  const showCount = !showUploading && (count > 0 || showAdminCatalog)
  return (
    <div className={StyleRefsClass.Header}>
      <span className={StyleRefsClass.Label}>
        <Images size={12} strokeWidth={1.7} />
        {StyleRefsCopy.StyleImagesLabel}
      </span>
      {showUploading ? (
        <span className={StyleRefsClass.Uploading}>{styleRefUploadingLabel(uploadingCount)}</span>
      ) : null}
      {showCount ? (
        <span className={StyleRefsClass.Count}>
          {styleRefCountLabel(count, STYLE_REFERENCE_URL_MAX)}
        </span>
      ) : null}
    </div>
  )
}

export function styleRefsHint(showAdminCatalog: boolean, isEmpty: boolean): string | null {
  if (showAdminCatalog) return StyleRefsCopy.StyleImagesAdminHint
  if (isEmpty) return StyleRefsCopy.StyleImagesHint
  return null
}
