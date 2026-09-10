import { generationModePresetSrefUrls } from '@/domains/2d-canvas/utils/mj-sref'
import { type GenerationModeDef } from '@/domains/2d-canvas/utils/generation-modes'

export function resolveGenerationModeSrefUrls(mode: GenerationModeDef): string[] {
  return generationModePresetSrefUrls(mode.id)
}
