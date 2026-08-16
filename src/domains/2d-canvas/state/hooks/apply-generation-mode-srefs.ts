import { fetchExistingMjSrefPresetUrls } from '@/domains/2d-canvas/core/io/style-refs.api'
import {
  MJ_SREF_SLOT_FILES,
  mjSrefPublicPath,
} from '@/domains/2d-canvas/constants/mj-sref'
import { type GenerationMode, type GenerationModeDef } from '@/domains/2d-canvas/constants/generation-modes'

export function mjSrefPresetPaths(modeId: GenerationMode): string[] {
  return MJ_SREF_SLOT_FILES.map(fileName => mjSrefPublicPath(modeId, fileName))
}

export async function resolveGenerationModeSrefUrls(
  mode: GenerationModeDef,
  origin: string,
): Promise<string[]> {
  return fetchExistingMjSrefPresetUrls({
    paths: mjSrefPresetPaths(mode.id),
    origin,
  })
}
