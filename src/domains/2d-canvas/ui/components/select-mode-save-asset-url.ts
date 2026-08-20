import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'
import { SELECT_MODE_TOOLBAR_COPY } from '../constants/select-mode-toolbar'

export function requireSavedAssetImageUrl(url: string | undefined): string {
  if (!url || !isPublicHttpUrl(url)) {
    throw new Error(SELECT_MODE_TOOLBAR_COPY.FAILED_SAVE_ASSET_IMAGE)
  }
  return url
}
