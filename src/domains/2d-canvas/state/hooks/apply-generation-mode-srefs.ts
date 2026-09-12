import { generationModePresetSrefUrls } from '@/domains/2d-canvas/utils/mj-sref'
import { type GenerationModeDef } from '@/domains/2d-canvas/utils/generation-modes'
import {
  defaultStyleRefCatalogUrls,
  hasStyleRefCatalog,
} from '@/domains/2d-canvas/utils/style-ref-catalog'

export function resolveGenerationModeSrefUrls(
  mode: GenerationModeDef,
  catalogUrls?: readonly string[],
): string[] {
  if (hasStyleRefCatalog(mode.id)) {
    return generationModePresetSrefUrls(
      mode.id,
      catalogUrls ?? defaultStyleRefCatalogUrls(mode.id),
    )
  }
  return generationModePresetSrefUrls(mode.id)
}
