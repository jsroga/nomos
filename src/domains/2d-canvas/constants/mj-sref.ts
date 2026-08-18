import { GenerationMode, type GenerationModeDef } from './generation-modes'
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
}

export enum PaintedIsometricSrefUrl {
  One = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051463098.png',
  Two = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051525449.png',
  Three = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051559763.png',
}

export const PAINTED_ISOMETRIC_SREF_URLS = [
  PaintedIsometricSrefUrl.One,
  PaintedIsometricSrefUrl.Two,
  PaintedIsometricSrefUrl.Three,
] as const

export function generationModePresetSrefUrls(modeId: GenerationMode): string[] {
  if (modeId === GenerationMode.PaintedIsometric) {
    return [...PAINTED_ISOMETRIC_SREF_URLS]
  }
  return []
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

export function clampStyleReferenceUrls(urls: string[]): string[] {
  return urls.filter(url => url.length > 0).slice(0, STYLE_REFERENCE_URL_MAX)
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

export function remainingStyleRefSlots(currentCount: number): number {
  return Math.max(0, STYLE_REFERENCE_URL_MAX - currentCount)
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

export function generationModePersistFields(input: {
  mode: GenerationModeDef
  styleReferenceUrls: string[]
}): {
  generationMode: GenerationMode
  canvasMasterPrompt: string
  styleReferenceUrls: string[]
  stylePreset: null
} {
  return {
    generationMode: input.mode.id,
    canvasMasterPrompt: input.mode.promptFragment,
    styleReferenceUrls: clampStyleReferenceUrls(input.styleReferenceUrls),
    stylePreset: null,
  }
}

export async function confirmGenerationModeSwitch(
  confirmFn: (options: { title: string; description: string }) => Promise<boolean>,
  title: string,
  description: string,
): Promise<boolean> {
  return confirmFn({ title, description })
}
