import { StyleRefsCopy } from './constants'
import { STYLE_REFERENCE_URL_MAX } from './style-ref-files'

export function styleRefCaption(index: number): string {
  return `${StyleRefsCopy.SrefCaption} ${index + 1}`
}

export function styleRefCountLabel(count: number, max: number = STYLE_REFERENCE_URL_MAX): string {
  return `${count} / ${max}`
}

export function styleRefUploadingLabel(count: number): string {
  return `${StyleRefsCopy.StyleImagesUploading} ${count}`
}
