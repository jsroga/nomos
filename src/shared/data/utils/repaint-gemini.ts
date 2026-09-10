/** GPT Image 2 inpainting wire strings for POST /api/repaint. */

import { StringSeparator } from '@/shared/data/constants/protocol'

export const REPAINT_DEFAULT_PROMPT = 'a detailed object matching the surrounding scene'

export const REPAINT_MASK_INSTRUCTION =
  'Edit image 1 using image 2 as an inpaint mask only (white = change, black = keep unchanged). Do not draw the mask. Preserve camera angle, lighting, and unmasked pixels. In the white region, place: '

export const REPAINT_STYLE_REF_PREFIX =
  ' Use these style references for visual guidance: '

export function buildRepaintPrompt(
  userPrompt: string | undefined,
  styleReferenceUrls?: string[],
): string {
  const trimmed = userPrompt?.trim() ?? ''
  const subject = trimmed.length > 0 ? trimmed : REPAINT_DEFAULT_PROMPT
  const body = `${REPAINT_MASK_INSTRUCTION}${subject}`
  if (!styleReferenceUrls?.length) return body
  return `${body}${REPAINT_STYLE_REF_PREFIX}${styleReferenceUrls.join(StringSeparator.CommaSpace)}.`
}

export enum GeminiResponseModality {
  Image = 'IMAGE',
  Text = 'TEXT',
}

export enum GeminiFinishReason {
  Safety = 'SAFETY',
}

export enum RepaintUploadPrefix {
  Image = 'repaint_image',
  Mask = 'repaint_mask',
}
