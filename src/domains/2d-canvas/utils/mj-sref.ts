import { GenerationMode, type GenerationModeDef } from './generation-modes'
import {
  PaintedIsometricSrefUrl,
  PAINTED_ISOMETRIC_SREF_URLS,
} from '../constants/painted-isometric-srefs'
import { clampStyleReferenceUrls } from '@/shared/canvas/style-refs'

export { PaintedIsometricSrefUrl, PAINTED_ISOMETRIC_SREF_URLS }

export {
  STYLE_REFERENCE_URL_MAX,
  STYLE_REF_BLOB_PREFIX,
  STYLE_REF_FILE_ACCEPT,
  StyleRefApiRoute,
  StyleRefFileSuffix,
  StyleRefImageMime,
  absolutePublicStyleRefUrl,
  absolutizeStyleReferenceUrls,
  clampStyleReferenceUrls,
  isAllowedStyleRefFile,
  isAllowedStyleRefMime,
  remainingStyleRefSlots,
  takeStyleRefFiles,
} from '@/shared/canvas/style-refs'

export function generationModePresetSrefUrls(
  modeId: GenerationMode,
  catalogUrls?: readonly string[],
): string[] {
  if (modeId === GenerationMode.PaintedIsometric && catalogUrls === undefined) {
    return [...PAINTED_ISOMETRIC_SREF_URLS]
  }
  return clampStyleReferenceUrls(catalogUrls ? [...catalogUrls] : [])
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
