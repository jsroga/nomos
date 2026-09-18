import toast from 'react-hot-toast'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { STYLE_REF_UNDO_TOAST_MS, StyleRefsCopy } from './constants'
import { styleRefCaption } from './style-ref-labels'

export function styleRefUploaderItems(
  styleReferenceUrls: readonly string[],
  isUploadingStyleRefs: boolean,
) {
  return [
    ...styleReferenceUrls.map((src, index) => ({
      id: String(index),
      src,
      caption: styleRefCaption(index),
    })),
    ...(isUploadingStyleRefs
      ? [{ id: StyleRefsCopy.SrefCaption, uploading: true as const }]
      : []),
  ]
}

export function toastStyleRefRemoved(
  snapshot: string[],
  handleRestoreStyleRefs: (urls: string[]) => void,
): void {
  toast(
    toastId => (
      <span className="flex items-center gap-3">
        <span>{StyleRefsCopy.ReferenceRemoved}</span>
        <button
          type={HtmlElementType.Button}
          className="font-mono text-xs text-primary"
          onClick={() => {
            handleRestoreStyleRefs(snapshot)
            toast.dismiss(toastId.id)
          }}
        >
          {StyleRefsCopy.Undo}
        </button>
      </span>
    ),
    { duration: STYLE_REF_UNDO_TOAST_MS },
  )
}
