import { cn } from '@/shared/data/utils'
import { TileBorderClass } from '@/domains/2d-canvas/ui/constants/tile-view-styles'

interface TileBorderClassInput {
  isSelected: boolean
  isGenerating: boolean
  isUpscaling: boolean
  isRepainting: boolean
  isEnhancing: boolean
  tileError?: string
}

export function tileBorderClassName(input: TileBorderClassInput): string {
  const { isSelected, isGenerating, isUpscaling, isRepainting, isEnhancing, tileError } = input
  const isBusy = isGenerating || isUpscaling || isRepainting || isEnhancing

  return cn(
    TileBorderClass.Base,
    isBusy ? TileBorderClass.Busy : isSelected && TileBorderClass.Selected,
    tileError && !isBusy && TileBorderClass.Error,
  )
}

export function resolveTileImageSrc(
  filename: string | null | undefined,
  projectId: string | undefined,
  retryCount: number,
): string | null {
  if (!filename || !projectId) return null

  const cacheBust = `t=${Date.now()}`
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    const separator = filename.includes('?') ? '&' : '?'
    return `${filename}${separator}${cacheBust}`
  }

  void retryCount
  return `/projects/${projectId}/${filename}?${cacheBust}`
}
