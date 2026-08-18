import { generationModePresetSrefUrls } from '@/domains/2d-canvas/constants/mj-sref'
import { type GenerationModeDef } from '@/domains/2d-canvas/constants/generation-modes'

export function resolveGenerationModeSrefUrls(mode: GenerationModeDef): string[] {
  return generationModePresetSrefUrls(mode.id)
}
