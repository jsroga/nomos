export {
  EpisodePremiseSectionKey,
  OZYMANSIAS_SECTIONS,
  OzymandiasSectionTone,
  type OzymandiasFieldKey,
  type OzymandiasSectionConfig,
} from '../constants/ozymandias-sections'
import {
  TONE_BG_CLASS,
  TONE_BORDER_CLASS,
  TONE_DASHED_CLASS,
  TONE_EMPTY_ICON_CLASS,
  TONE_HOVER_CLASS,
  TONE_LABEL_CLASS,
  TONE_SKELETON_CLASS,
  OzymandiasSectionTone,
} from '../constants/ozymandias-sections'

export function ozymandiasLabelClass(tone: OzymandiasSectionTone): string {
  return TONE_LABEL_CLASS[tone]
}

export function ozymandiasBorderClass(tone: OzymandiasSectionTone): string {
  return TONE_BORDER_CLASS[tone]
}

export function ozymandiasEditClass(tone: OzymandiasSectionTone): string {
  return TONE_BG_CLASS[tone]
}

export function ozymandiasDashedClass(tone: OzymandiasSectionTone): string {
  return TONE_DASHED_CLASS[tone]
}

export function ozymandiasSkeletonClass(tone: OzymandiasSectionTone): string {
  return TONE_SKELETON_CLASS[tone]
}

export function ozymandiasHoverClass(tone: OzymandiasSectionTone): string {
  return TONE_HOVER_CLASS[tone]
}

export function ozymandiasEmptyIconClass(tone: OzymandiasSectionTone): string {
  return TONE_EMPTY_ICON_CLASS[tone]
}
