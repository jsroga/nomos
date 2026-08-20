import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'
import { FsDirectory } from '@/shared/data/constants/protocol'
import { StorageFileExtension } from '@/shared/data/storage/constants/storage-service'

function lastPathSegment(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean)
  return parts[parts.length - 1]
}

export function assetEditorSaveBasename(imageFilename: string): string {
  if (isPublicHttpUrl(imageFilename)) {
    try {
      const base = lastPathSegment(new URL(imageFilename).pathname)
      if (base) return decodeURIComponent(base)
    } catch {
      return `asset.${StorageFileExtension.Png}`
    }
    return `asset.${StorageFileExtension.Png}`
  }
  const prefix = `${FsDirectory.Assets}/`
  if (imageFilename.startsWith(prefix)) {
    return imageFilename.slice(prefix.length)
  }
  return imageFilename
}

export function assetEditorSaveFilename(imageFilename: string): string {
  return `${FsDirectory.Assets}/${assetEditorSaveBasename(imageFilename)}`
}
