import { UrlScheme } from '@/shared/data/constants/protocol'

export const STYLE_REFERENCE_URL_MAX = 3
export const STYLE_REF_BLOB_PREFIX = 'style-refs'

export enum StyleRefFileSuffix {
  Png = '.png',
  Jpg = '.jpg',
  Jpeg = '.jpeg',
  Webp = '.webp',
}

export enum StyleRefImageMime {
  Png = 'image/png',
  Jpeg = 'image/jpeg',
  Webp = 'image/webp',
}

export const STYLE_REF_FILE_ACCEPT = [
  StyleRefImageMime.Png,
  StyleRefImageMime.Jpeg,
  StyleRefImageMime.Webp,
].join(',')

export enum StyleRefApiRoute {
  Upload = '/api/style-refs/upload',
  Catalog = '/api/style-refs/catalog',
}

export enum StyleRefProjectPatch {
  StyleReferenceUrls = 'styleReferenceUrls',
  StorytellerStyleReferenceUrls = 'storytellerStyleReferenceUrls',
  StylePreset = 'stylePreset',
}

export function clampStyleReferenceUrls(urls: string[]): string[] {
  return urls.filter(url => url.length > 0).slice(0, STYLE_REFERENCE_URL_MAX)
}

export function remainingStyleRefSlots(currentCount: number): number {
  return Math.max(0, STYLE_REFERENCE_URL_MAX - currentCount)
}

export function isAllowedStyleRefMime(type: string): boolean {
  return (
    type === StyleRefImageMime.Png ||
    type === StyleRefImageMime.Jpeg ||
    type === StyleRefImageMime.Webp
  )
}

export function isAllowedStyleRefFile(file: File): boolean {
  if (isAllowedStyleRefMime(file.type)) return true
  const name = file.name.toLowerCase()
  return (
    name.endsWith(StyleRefFileSuffix.Png) ||
    name.endsWith(StyleRefFileSuffix.Jpg) ||
    name.endsWith(StyleRefFileSuffix.Jpeg) ||
    name.endsWith(StyleRefFileSuffix.Webp)
  )
}

export function takeStyleRefFiles(files: Iterable<File>, remainingSlots: number): File[] {
  if (remainingSlots <= 0) return []
  const accepted: File[] = []
  for (const file of files) {
    if (accepted.length >= remainingSlots) break
    if (isAllowedStyleRefFile(file)) accepted.push(file)
  }
  return accepted
}

export function absolutePublicStyleRefUrl(path: string, origin: string): string {
  if (path.startsWith(UrlScheme.Http)) return path
  const base = origin.endsWith('/') ? origin.slice(0, -1) : origin
  const relative = path.startsWith('/') ? path : `/${path}`
  return `${base}${relative}`
}

export function absolutizeStyleReferenceUrls(urls: string[], origin: string): string[] {
  return clampStyleReferenceUrls(urls.map(url => absolutePublicStyleRefUrl(url, origin)))
}
