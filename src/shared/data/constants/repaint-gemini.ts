/** Gemini inpainting wire strings for POST /api/repaint. */

export const REPAINT_DEFAULT_PROMPT = 'High quality, detailed, seamless blend'

export const REPAINT_MASK_INSTRUCTION =
  'Edit the first image using the second image as a mask. The white area in the mask indicates where to edit. Seamlessly blend the changes.'

export const REPAINT_STYLE_REF_PREFIX =
  ' Use these style references for visual guidance: '

export enum GeminiResponseModality {
  Image = 'IMAGE',
  Text = 'TEXT',
}

export enum GeminiFinishReason {
  Safety = 'SAFETY',
}
